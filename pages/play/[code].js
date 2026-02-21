import { useState, useEffect } from 'react';
import { auth, realtimeDb, db } from '../firebase'; // Ruta correcta desde pages/ a raíz
import { ref, onValue, update } from 'firebase/database';
import { doc, onSnapshot, updateDoc, increment } from 'firebase/firestore';
import { useRouter } from 'next/router';

export default function PlayQuiz() {
  const router = useRouter();
  const { code } = router.query;

  const [game, setGame] = useState(null);
  const [playerData, setPlayerData] = useState(null);
  const [playerCharacter, setPlayerCharacter] = useState('default');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(-1);
  const [selectedOption, setSelectedOption] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // Timer
  const TIME_PER_QUESTION = 30;
  const [timeLeft, setTimeLeft] = useState(TIME_PER_QUESTION);
  const [timerActive, setTimerActive] = useState(false);

  // Cargar personaje del usuario
  useEffect(() => {
    if (!auth.currentUser) {
      router.push('/');
      return;
    }

    const userRef = doc(db, 'users', auth.currentUser.uid);
    const unsubscribe = onSnapshot(userRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setPlayerCharacter(data.selectedCharacter || 'default');
      }
    });

    return () => unsubscribe();
  }, [router]);

  // Escuchar juego en tiempo real
  useEffect(() => {
    if (!code || !auth.currentUser) return;

    setLoading(true);
    const gameRef = ref(realtimeDb, `games/${code}`);

    const unsubscribe = onValue(gameRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        setError('Quiz no encontrado o eliminado');
        setLoading(false);
        return;
      }

      setGame(data);
      setCurrentQuestionIndex(data.currentQuestion ?? -1);
      setPlayerData(data.players?.[auth.currentUser.uid] || {});

      // Reiniciar timer al cambiar pregunta
      if (data.currentQuestion !== currentQuestionIndex) {
        setTimeLeft(TIME_PER_QUESTION);
        setTimerActive(true);
        setSelectedOption(null);
        setFeedback('');
      }

      // Recompensa única al terminar
      if (data.ended && !data.players?.[auth.currentUser.uid]?.rewardGiven) {
        giveReward();
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, [code, currentQuestionIndex]);

  // Timer countdown
  useEffect(() => {
    if (!timerActive || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setTimerActive(false);
          setFeedback('¡Tiempo agotado!');
          update(ref(realtimeDb, `games/${code}/players/${auth.currentUser.uid}`), {
            answered: true
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timerActive, timeLeft, code]);

  const giveReward = async () => {
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, { money: increment(10) });

      update(ref(realtimeDb, `games/${code}/players/${auth.currentUser.uid}`), {
        rewardGiven: true
      });

      setFeedback('¡+10 monedas por completar el quiz! 🎉');
    } catch (err) {
      setFeedback('Error al recibir recompensa');
    }
  };

  const handleAnswer = (optionIndex) => {
    if (selectedOption !== null || timeLeft <= 0) return;

    setSelectedOption(optionIndex);

    const question = game.questions[currentQuestionIndex];
    const isCorrect = optionIndex === question.correct;

    update(ref(realtimeDb, `games/${code}/players/${auth.currentUser.uid}`), {
      score: increment(isCorrect ? 10 : 0),
      answered: true,
      lastAnswerCorrect: isCorrect
    });

    setFeedback(isCorrect ? '¡Correcto! +10 puntos' : 'Incorrecto...');
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        fontSize: '1.5rem',
        color: '#333'
      }}>
        Cargando quiz...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        color: '#e74c3c',
        fontSize: '1.5rem',
        textAlign: 'center',
        padding: '20px'
      }}>
        {error}
      </div>
    );
  }

  if (currentQuestionIndex === -1) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea, #764ba2)',
        color: 'white',
        padding: '20px'
      }}>
        <h2 style={{ marginBottom: '20px' }}>Esperando a que el host inicie el quiz...</h2>
        <p style={{ fontSize: '1.3rem' }}>Código: <strong>{code}</strong></p>
      </div>
    );
  }

  if (currentQuestionIndex >= game.questions.length || game.ended) {
    const leaderboard = Object.entries(game.players || {})
      .map(([uid, p]) => ({ uid, email: p.email || 'Anónimo', score: p.score || 0 }))
      .sort((a, b) => b.score - a.score);

    return (
      <div style={{
        padding: '60px 20px',
        maxWidth: '900px',
        margin: '0 auto',
        textAlign: 'center',
        background: 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)',
        minHeight: '100vh'
      }}>
        <h1 style={{ marginBottom: '40px', color: '#2c3e50', fontSize: '3rem' }}>¡Quiz terminado!</h1>

        <p style={{ fontSize: '1.8rem', marginBottom: '30px' }}>
          Tu puntuación final: <strong>{playerData?.score || 0} puntos</strong>
        </p>

        <p style={{
          color: '#27ae60',
          fontSize: '1.6rem',
          marginBottom: '50px',
          fontWeight: 'bold'
        }}>
          {feedback || '¡Gran partida!'}
        </p>

        <h2 style={{ marginBottom: '30px', fontSize: '2rem' }}>Clasificación</h2>

        {leaderboard.length > 0 ? (
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '30px',
            boxShadow: '0 15px 35px rgba(0,0,0,0.15)',
            overflowX: 'auto'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f1f5f9' }}>
                  <th style={{ padding: '15px', textAlign: 'left', fontWeight: 'bold' }}>Posición</th>
                  <th style={{ padding: '15px', textAlign: 'left', fontWeight: 'bold' }}>Jugador</th>
                  <th style={{ padding: '15px', textAlign: 'right', fontWeight: 'bold' }}>Puntos</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((player, index) => (
                  <tr
                    key={player.uid}
                    style={{
                      borderBottom: '1px solid #e2e8f0',
                      background: player.uid === auth.currentUser.uid ? '#e0f2fe' : 'transparent'
                    }}
                  >
                    <td style={{ padding: '15px', fontWeight: 'bold' }}>{index + 1}°</td>
                    <td style={{ padding: '15px' }}>
                      {player.email.split('@')[0]}{player.uid === auth.currentUser.uid && ' (tú)'}
                    </td>
                    <td style={{ padding: '15px', textAlign: 'right', fontWeight: 'bold' }}>
                      {player.score}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ fontSize: '1.3rem' }}>No hay jugadores registrados aún.</p>
        )}

        <button
          onClick={() => router.push('/dashboard')}
          style={{
            marginTop: '60px',
            padding: '18px 50px',
            fontSize: '1.3rem',
            background: '#3498db',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            cursor: 'pointer',
            boxShadow: '0 8px 25px rgba(0,0,0,0.2)',
            transition: 'transform 0.2s, box-shadow 0.2s'
          }}
        >
          Volver al menú
        </button>
      </div>
    );
  }

  const question = game.questions[currentQuestionIndex];

  return (
    <div style={{
      padding: '40px 20px',
      maxWidth: '900px',
      margin: '0 auto',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      minHeight: '100vh',
      color: 'white'
    }}>
      {/* Personaje */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <p style={{ fontSize: '1.5rem', marginBottom: '15px' }}>
          Jugando como: <strong>{playerCharacter}</strong>
        </p>
        <div style={{
          width: '120px',
          height: '120px',
          background: '#ccc',
          borderRadius: '50%',
          margin: '0 auto 20px',
          border: '5px solid #fff',
          boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
        }} />
        <p style={{ fontSize: '1.3rem' }}>
          Puntuación actual: <strong>{playerData?.score || 0}</strong>
        </p>
      </div>

      {/* Timer */}
      <div style={{ marginBottom: '40px' }}>
        <div style={{
          height: '15px',
          background: 'rgba(255,255,255,0.3)',
          borderRadius: '8px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${(timeLeft / TIME_PER_QUESTION) * 100}%`,
            height: '100%',
            background: timeLeft > 10 ? '#2ecc71' : timeLeft > 5 ? '#f1c40f' : '#e74c3c',
            transition: 'width 1s linear'
          }} />
        </div>
        <p style={{
          textAlign: 'center',
          marginTop: '12px',
          fontSize: '1.5rem',
          fontWeight: 'bold',
          color: timeLeft <= 5 ? '#e74c3c' : 'white'
        }}>
          Tiempo restante: {timeLeft}s
        </p>
      </div>

      <h2 style={{ textAlign: 'center', marginBottom: '25px', fontSize: '2rem' }}>
        Pregunta {currentQuestionIndex + 1} de {game.questions.length}
      </h2>

      <h3 style={{ textAlign: 'center', marginBottom: '50px', fontSize: '1.8rem' }}>
        {question.question}
      </h3>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '25px'
      }}>
        {question.options.map((opt, index) => (
          <button
            key={index}
            onClick={() => handleAnswer(index)}
            disabled={selectedOption !== null || timeLeft <= 0}
            style={{
              padding: '25px',
              fontSize: '1.3rem',
              background: selectedOption === index
                ? (question.correct === index ? '#27ae60' : '#e74c3c')
                : 'rgba(255,255,255,0.9)',
              color: selectedOption === index ? 'white' : '#2c3e50',
              border: 'none',
              borderRadius: '15px',
              cursor: selectedOption === null && timeLeft > 0 ? 'pointer' : 'default',
              transition: 'all 0.3s ease',
              boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
              transform: selectedOption === index ? 'scale(1.08)' : 'scale(1)'
            }}
          >
            {opt}
          </button>
        ))}
      </div>

      {feedback && (
        <p style={{
          marginTop: '50px',
          textAlign: 'center',
          fontSize: '2rem',
          fontWeight: 'bold',
          color: feedback.includes('Correcto') ? '#27ae60' : '#e74c3c',
          textShadow: '0 2px 10px rgba(0,0,0,0.3)'
        }}>
          {feedback}
        </p>
      )}
    </div>
  );
}
