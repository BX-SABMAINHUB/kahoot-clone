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

  // Timer
  const TIME_PER_QUESTION = 30;
  const [timeLeft, setTimeLeft] = useState(TIME_PER_QUESTION);
  const [timerActive, setTimerActive] = useState(false);

  // Cargar personaje
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

  // Escuchar juego
  useEffect(() => {
    if (!code || !auth.currentUser) return;

    setLoading(true);
    const gameRef = ref(realtimeDb, `games/${code}`);

    const unsubscribe = onValue(gameRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        setError('Quiz no encontrado');
        setLoading(false);
        return;
      }

      setGame(data);
      setCurrentQuestionIndex(data.currentQuestion ?? -1);
      setPlayerData(data.players?.[auth.currentUser.uid] || {});

      if (data.currentQuestion !== currentQuestionIndex) {
        setTimeLeft(TIME_PER_QUESTION);
        setTimerActive(true);
        setSelectedOption(null);
        setFeedback('');
      }

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

  if (loading) return <div style={{ padding: '100px', textAlign: 'center' }}>Cargando...</div>;
  if (error) return <div style={{ padding: '100px', textAlign: 'center', color: 'red' }}>{error}</div>;

  if (currentQuestionIndex === -1) {
    return <div style={{ padding: '100px', textAlign: 'center' }}>Esperando inicio...</div>;
  }

  if (currentQuestionIndex >= game.questions.length || game.ended) {
    const leaderboard = Object.entries(game.players || {})
      .map(([uid, p]) => ({ uid, email: p.email || 'Anónimo', score: p.score || 0 }))
      .sort((a, b) => b.score - a.score);

    return (
      <div style={{ padding: '60px', textAlign: 'center' }}>
        <h1>Quiz terminado</h1>
        <p>Tu puntuación: {playerData.score || 0}</p>
        <p>{feedback}</p>
        <h2>Leaderboard</h2>
        {leaderboard.map((p, i) => (
          <p key={i}>{i + 1}. {p.email} - {p.score}</p>
        ))}
        <button onClick={() => router.push('/dashboard')}>Volver</button>
      </div>
    );
  }

  const question = game.questions[currentQuestionIndex];

  return (
    <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
      <p>Jugando como: {playerCharacter}</p>
      <h2>Pregunta {currentQuestionIndex + 1}</h2>
      <h3>{question.question}</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {question.options.map((opt, i) => (
          <button key={i} onClick={() => handleAnswer(i)} disabled={selectedOption !== null || timeLeft <= 0}>
            {opt}
          </button>
        ))}
      </div>
      <p>Tiempo: {timeLeft}</p>
      <p>{feedback}</p>
      <p>Puntuación: {playerData.score || 0}</p>
    </div>
  );
}
