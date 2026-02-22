// pages/play/[code].js
import { useState, useEffect } from 'react';
import { auth, realtimeDb, db } from '../firebase';
import { ref, onValue, update } from 'firebase/database';
import { doc, onSnapshot, updateDoc, increment } from 'firebase/firestore';
import { useRouter } from 'next/router';

export default function PlayQuiz() {
  const router = useRouter();
  const { code } = router.query;

  const [game, setGame] = useState(null);
  const [playerData, setPlayerData] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(-1);
  const [selectedOption, setSelectedOption] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [wrongAnswers, setWrongAnswers] = useState(0);
  const [showRoulette, setShowRoulette] = useState(false);
  const [rouletteResult, setRouletteResult] = useState(null);
  const [rouletteCooldown, setRouletteCooldown] = useState(false);

  const TIME_PER_QUESTION = 20;
  const [timeLeft, setTimeLeft] = useState(TIME_PER_QUESTION);
  const [timerActive, setTimerActive] = useState(false);

  const isCreator = auth.currentUser && game?.creator === auth.currentUser.uid;

  // Cargar datos del jugador (monedas, cooldown ruleta, etc.)
  useEffect(() => {
    if (!auth.currentUser) {
      router.replace('/');
      return;
    }

    const userRef = doc(db, 'users', auth.currentUser.uid);
    const unsubscribe = onSnapshot(userRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const lastSpin = data.lastRouletteSpin || 0;
        const cooldown = 5 * 60 * 60 * 1000; // 5 horas
        setRouletteCooldown(Date.now() - lastSpin < cooldown);
      }
    });

    return () => unsubscribe();
  }, [router]);

  // Escuchar el juego en tiempo real
  useEffect(() => {
    if (!code) return;

    setLoading(true);
    setError('');

    const gameRef = ref(realtimeDb, `games/${code}`);

    const unsubscribe = onValue(gameRef, (snap) => {
      const data = snap.val();
      if (!data) {
        setError('Quiz no encontrado o eliminado');
        setLoading(false);
        return;
      }

      setGame(data);
      setCurrentQuestionIndex(data.currentQuestion ?? -1);
      setPlayerData(data.players?.[auth.currentUser?.uid] || {});

      // Si cambia la pregunta → reiniciar timer
      if (data.currentQuestion !== currentQuestionIndex) {
        setTimeLeft(TIME_PER_QUESTION);
        setTimerActive(true);
        setSelectedOption(null);
        setFeedback('');
      }

      // Si terminó y el jugador ya respondió todo → mostrar ruleta
      if (data.ended && data.players?.[auth.currentUser?.uid]?.answeredAll) {
        setShowRoulette(true);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, [code, currentQuestionIndex]);

  // Timer countdown
  useEffect(() => {
    if (!timerActive || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
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

  const handleAnswer = (optionIndex) => {
    if (selectedOption !== null || timeLeft <= 0 || !game?.started) return;

    setSelectedOption(optionIndex);

    const question = game.questions[currentQuestionIndex];
    const isCorrect = optionIndex === question.correct;

    if (isCorrect) setCorrectAnswers(p => p + 1);
    else setWrongAnswers(p => p + 1);

    setFeedback(isCorrect ? '¡Correcto!' : 'Incorrecto...');

    update(ref(realtimeDb, `games/${code}/players/${auth.currentUser.uid}`), {
      score: increment(isCorrect ? 10 : 0),
      answered: true,
      lastAnswerCorrect: isCorrect
    });
  };

  const finishQuiz = async () => {
    const baseCoins = correctAnswers * 10;
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, { money: increment(baseCoins) });

      update(ref(realtimeDb, `games/${code}/players/${auth.currentUser.uid}`), {
        answeredAll: true,
        coinsEarned: baseCoins
      });

      setFeedback(`¡Terminaste! Ganaste ${baseCoins} monedas base.`);
      setShowRoulette(true);
    } catch (err) {
      setError('Error al dar monedas: ' + err.message);
    }
  };

  const spinRoulette = async () => {
    if (rouletteCooldown) return setFeedback('Espera 5 horas para girar de nuevo');

    const prizes = [0,0,0,0,0,0,0,0,0,0,1000,5000]; // 10 nada, 1×1000, 1×5000
    const result = prizes[Math.floor(Math.random() * prizes.length)];

    setRouletteResult(result);
    setRouletteCooldown(true);

    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, {
        lastRouletteSpin: Date.now(),
        money: increment(result)
      });

      setFeedback(`¡Ruleta terminada! Ganaste ${result} monedas extra 🎉`);
    } catch (err) {
      setError('Error en ruleta: ' + err.message);
    }
  };

  if (loading) return <div style={{ padding: '100px', textAlign: 'center', fontSize: '2rem' }}>Cargando...</div>;
  if (error) return <div style={{ padding: '100px', textAlign: 'center', color: 'red', fontSize: '1.5rem' }}>{error}</div>;

  // Lobby (si el quiz no ha empezado)
  if (!game?.started) {
    return (
      <div style={{
        padding: '60px 20px',
        maxWidth: '800px',
        margin: '0 auto',
        textAlign: 'center',
        background: '#f0f4f8',
        minHeight: '100vh'
      }}>
        <h1 style={{ color: '#2c3e50', marginBottom: '40px' }}>Lobby - Código: <strong>{code}</strong></h1>

        <p style={{ fontSize: '1.3rem', marginBottom: '30px' }}>
          Esperando a que el creador inicie el quiz...
        </p>

        <h3>Jugadores conectados ({Object.keys(game?.players || {}).length}):</h3>
        <div style={{ margin: '20px 0' }}>
          {Object.values(game?.players || {}).map(p => (
            <div key={p.uid} style={{
              background: '#fff',
              padding: '12px',
              margin: '8px',
              borderRadius: '10px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
              {p.email || 'Jugador anónimo'}
              {p.uid === game?.creator && ' 👑 (Creador)'}
            </div>
          ))}
        </div>

        {isCreator && (
          <button
            onClick={() => update(ref(realtimeDb, `games/${code}`), { started: true, currentQuestion: 0 })}
            style={{
              marginTop: '40px',
              padding: '16px 60px',
              fontSize: '1.5rem',
              background: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer'
            }}
          >
            Empezar Quiz
          </button>
        )}
      </div>
    );
  }

  // Pantalla de juego (después de empezar)
  if (currentQuestionIndex >= game.questions.length || game.ended) {
    return (
      <div style={{ padding: '60px 20px', maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
        <h1 style={{ color: '#2c3e50', marginBottom: '40px' }}>¡Quiz terminado!</h1>

        <div style={{
          background: '#e8f5e9',
          padding: '30px',
          borderRadius: '16px',
          marginBottom: '40px'
        }}>
          <p style={{ fontSize: '1.8rem', marginBottom: '20px' }}>
            Aciertos: <strong style={{ color: '#27ae60' }}>{correctAnswers}</strong>
          </p>
          <p style={{ fontSize: '1.8rem', marginBottom: '20px' }}>
            Fallos: <strong style={{ color: '#e74c3c' }}>{wrongAnswers}</strong>
          </p>
          <p style={{ fontSize: '2.2rem', fontWeight: 'bold', color: '#2e7d32' }}>
            Monedas ganadas: {correctAnswers * 10}
          </p>
        </div>

        {showRoulette && !rouletteResult ? (
          <div style={{ margin: '40px 0' }}>
            <h2 style={{ marginBottom: '20px' }}>Ruleta disponible</h2>
            <p style={{ marginBottom: '20px' }}>
              Gírala para tener opción a 1000 o 5000 monedas extra (cada 5 horas)
            </p>
            <button
              onClick={spinRoulette}
              style={{
                padding: '16px 60px',
                fontSize: '1.4rem',
                background: '#f39c12',
                color: 'white',
                border: 'none',
                borderRadius: '50px',
                cursor: 'pointer',
                boxShadow: '0 5px 15px rgba(0,0,0,0.2)'
              }}
            >
              Girar Ruleta
            </button>
          </div>
        ) : rouletteResult ? (
          <div style={{
            background: '#fff3e0',
            padding: '30px',
            borderRadius: '16px',
            margin: '40px 0',
            fontSize: '1.6rem'
          }}>
            <h2 style={{ color: '#e65100' }}>¡Ruleta terminada!</h2>
            <p style={{ fontSize: '2.5rem', fontWeight: 'bold', margin: '20px 0' }}>
              {rouletteResult === 0 ? '¡Nada! 😅' : `¡Ganaste ${rouletteResult} monedas extra! 🎉`}
            </p>
          </div>
        ) : null}

        <button
          onClick={() => router.push('/dashboard')}
          style={{
            padding: '16px 50px',
            fontSize: '1.3rem',
            background: '#3498db',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            cursor: 'pointer',
            marginTop: '40px'
          }}
        >
          Volver al Dashboard
        </button>
      </div>
    );
  }

  const question = game.questions[currentQuestionIndex];

  return (
    <div style={{ padding: '40px 20px', maxWidth: '900px', margin: '0 auto' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '30px', color: '#2c3e50' }}>
        Pregunta {currentQuestionIndex + 1} de {game.questions.length}
      </h2>

      <h3 style={{ textAlign: 'center', marginBottom: '40px', fontSize: '1.6rem' }}>
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
              padding: '25px',
              fontSize: '1.3rem',
              background: selectedOption === index
                ? (question.correct === index ? '#27ae60' : '#e74c3c')
                : '#ecf0f1',
              color: selectedOption === index ? 'white' : '#333',
              border: 'none',
              borderRadius: '15px',
              cursor: selectedOption === null && timeLeft > 0 ? 'pointer' : 'default',
              transition: 'all 0.3s',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              transform: selectedOption === index ? 'scale(1.08)' : 'scale(1)'
            }}
          >
            {opt}
          </button>
        ))}
      </div>

      <div style={{ marginTop: '40px', textAlign: 'center' }}>
        <p style={{
          fontSize: '1.5rem',
          fontWeight: 'bold',
          color: timeLeft <= 5 ? '#e74c3c' : '#333'
        }}>
          Tiempo restante: {timeLeft}s
        </p>

        {feedback && (
          <p style={{
            marginTop: '20px',
            fontSize: '1.8rem',
            fontWeight: 'bold',
            color: feedback.includes('Correcto') ? '#27ae60' : '#e74c3c'
          }}>
            {feedback}
          </p>
        )}
      </div>
    </div>
  );
}
