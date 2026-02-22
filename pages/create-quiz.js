import { useState, useEffect } from 'react';
import { auth, realtimeDb, db } from '../firebase';  // Ruta corregida: desde pages/ a raíz
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

  // Timer por pregunta
  const TIME_PER_QUESTION = 30;
  const [timeLeft, setTimeLeft] = useState(TIME_PER_QUESTION);
  const [timerActive, setTimerActive] = useState(false);

  // Cargar personaje seleccionado
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

      // Reiniciar timer cuando cambia la pregunta
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

  if (loading) return <div style={{ padding: '100px', textAlign: 'center' }}>Cargando quiz...</div>;
  if (error) return <div style={{ padding: '100px', textAlign: 'center', color: 'red' }}>{error}</div>;

  if (currentQuestionIndex === -1) {
    return <div style={{ padding: '100px', textAlign: 'center' }}>Esperando a que el host inicie el quiz...</div>;
  }

  if (currentQuestionIndex >= game.questions.length || game.ended) {
    const leaderboard = Object.entries(game.players || {})
      .map(([uid, p]) => ({ uid, email: p.email || 'Anónimo', score: p.score || 0 }))
      .sort((a, b) => b.score - a.score);

    return (
      <div style={{ padding: '60px 20px', maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
        <h1 style={{ marginBottom: '40px', color: '#2c3e50' }}>¡Quiz terminado!</h1>

        <p style={{ fontSize: '1.6rem', marginBottom: '30px' }}>
          Tu puntuación final: <strong>{playerData?.score || 0} puntos</strong>
        </p>

        <p style={{ color: '#27ae60', fontSize: '1.4rem', marginBottom: '50px' }}>
          {feedback || '¡Buen trabajo!'}
        </p>

        <h2 style={{ marginBottom: '25px', fontSize: '1.8rem' }}>Clasificación</h2>

        {leaderboard.length > 0 ? (
          <div style={{ 
            background: '#f8f9fa', 
            borderRadius: '12px', 
            padding: '20px', 
            boxShadow: '0 8px 25px rgba(0,0,0,0.1)',
            overflowX: 'auto'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#e9ecef' }}>
                  <th style={{ padding: '15px', textAlign: 'left' }}>Posición</th>
                  <th style={{ padding: '15px', textAlign: 'left' }}>Jugador</th>
                  <th style={{ padding: '15px', textAlign: 'right' }}>Puntos</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((player, index) => (
                  <tr 
                    key={player.uid}
                    style={{ 
                      borderBottom: '1px solid #dee2e6',
                      background: player.uid === auth.currentUser.uid ? '#d4edda' : 'transparent'
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
          <p>No hay jugadores aún.</p>
        )}

        <button
          onClick={() => router.push('/dashboard')}
          style={{
            marginTop: '50px',
            padding: '15px 40px',
            fontSize: '1.2rem',
            background: '#3498db',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            cursor: 'pointer',
            boxShadow: '0 5px 15px rgba(0,0,0,0.2)'
          }}
        >
          Volver al menú
        </button>
      </div>
    );
  }

  const question = game.questions[currentQuestionIndex];

  return (
    <div style={{ padding: '40px 20px', maxWidth: '900px', margin: '0 auto' }}>
      {/* Personaje */}
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <p style={{ fontSize: '1.4rem', marginBottom: '12px' }}>
          Jugando como: <strong>{playerCharacter}</strong>
        </p>
        <div style={{
          width: '100px',
          height: '100px',
          background: '#ccc',
          borderRadius: '50%',
          margin: '0 auto 20px',
          border: '4px solid #3498db',
          boxShadow: '0 5px 15px rgba(0,0,0,0.2)'
        }} />
        <p style={{ fontSize: '1.2rem' }}>
          Puntuación actual: <strong>{playerData?.score || 0}</strong>
        </p>
      </div>

      {/* Timer */}
      <div style={{ marginBottom: '30px' }}>
        <div style={{
          height: '12px',
          background: '#e9ecef',
          borderRadius: '6px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${(timeLeft / TIME_PER_QUESTION) * 100}%`,
            height: '100%',
            background: timeLeft > 10 ? '#27ae60' : timeLeft > 5 ? '#f39c12' : '#e74c3c',
            transition: 'width 1s linear'
          }} />
        </div>
        <p style={{
          textAlign: 'center',
          marginTop: '10px',
          fontSize: '1.3rem',
          fontWeight: 'bold',
          color: timeLeft <= 5 ? '#e74c3c' : '#333'
        }}>
          Tiempo restante: {timeLeft}s
        </p>
      </div>

      <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>
        Pregunta {currentQuestionIndex + 1} de {game.questions.length}
      </h2>

      <h3 style={{ textAlign: 'center', marginBottom: '40px', fontSize: '1.5rem' }}>
        {question.question}
      </h3>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '20px'
      }}>
        {question.options.map((opt, index) => (
          <button
            key={index}
            onClick={() => handleAnswer(index)}
            disabled={selectedOption !== null || timeLeft <= 0}
            style={{
              padding: '20px',
              fontSize: '1.2rem',
              background: selectedOption === index
                ? (question.correct === index ? '#27ae60' : '#e74c3c')
                : '#ecf0f1',
              color: selectedOption === index ? 'white' : '#333',
              border: 'none',
              borderRadius: '12px',
              cursor: selectedOption === null && timeLeft > 0 ? 'pointer' : 'default',
              transition: 'all 0.3s',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              transform: selectedOption === index ? 'scale(1.05)' : 'scale(1)'
            }}
          >
            {opt}
          </button>
        ))}
      </div>

      {feedback && (
        <p style={{
          marginTop: '40px',
          textAlign: 'center',
          fontSize: '1.6rem',
          fontWeight: 'bold',
          color: feedback.includes('Correcto') ? '#27ae60' : '#e74c3c'
        }}>
          {feedback}
        </p>
      )}
    </div>
  );
}
