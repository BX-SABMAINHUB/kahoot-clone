import { useState, useEffect } from 'react';
import { auth, realtimeDb } from '../firebase';
import { ref, onValue, update } from 'firebase/database';
import { useRouter } from 'next/router';

export default function PlayQuiz() {
  const router = useRouter();
  const { code } = router.query;

  const [game, setGame] = useState(null);
  const [player, setPlayer] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(-1);
  const [selected, setSelected] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!code || !auth.currentUser) return;

    setLoading(true);

    const gameRef = ref(realtimeDb, `games/${code}`);
    const playerRef = ref(realtimeDb, `games/${code}/players/${auth.currentUser.uid}`);

    const unsubGame = onValue(gameRef, snap => {
      const data = snap.val();
      if (!data) {
        setError('Quiz no encontrado');
        setLoading(false);
        return;
      }
      setGame(data);
      setCurrentQuestionIndex(data.currentQuestion ?? -1);
      setLoading(false);
    });

    const unsubPlayer = onValue(playerRef, snap => {
      setPlayer(snap.val() || {});
    });

    return () => {
      unsubGame();
      unsubPlayer();
    };
  }, [code]);

  const answer = index => {
    if (selected !== null || !game?.started) return;

    setSelected(index);

    const q = game.questions[currentQuestionIndex];
    const right = index === q.correct;

    setFeedback(right ? 'Correcto' : 'Incorrecto');

    update(ref(realtimeDb, `games/${code}/players/${auth.currentUser.uid}`), {
      score: increment(right ? 10 : 0),
      answered: true,
      lastCorrect: right
    });
  };

  if (loading) return <div style={{ padding: '100px', textAlign: 'center', fontSize: '2rem' }}>Cargando...</div>;
  if (error) return <div style={{ padding: '100px', textAlign: 'center', color: 'red' }}>{error}</div>;

  if (!game?.started) {
    return (
      <div style={{ padding: '60px', textAlign: 'center' }}>
        <h1>Lobby - Código: {code}</h1>
        <p>Esperando al creador...</p>
        <h3>Jugadores:</h3>
        {Object.values(game?.players || {}).map(p => (
          <div key={p.uid}>{p.email || p.uid.slice(0,8)}...</div>
        ))}
      </div>
    );
  }

  if (currentQuestionIndex >= game.questions.length) {
    return (
      <div style={{ padding: '60px', textAlign: 'center' }}>
        <h1>¡Quiz terminado!</h1>
        <button onClick={() => router.push('/dashboard')} style={{ padding: '16px 40px', fontSize: '1.3rem' }}>
          Volver
        </button>
      </div>
    );
  }

  const q = game.questions[currentQuestionIndex];

  return (
    <div style={{ padding: '40px 20px', maxWidth: '900px', margin: '0 auto' }}>
      <h2>Pregunta {currentQuestionIndex + 1} de {game.questions.length}</h2>
      <h3>{q.question}</h3>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '30px' }}>
        {q.options.map((opt, i) => (
          <button
            key={i}
            onClick={() => answer(i)}
            disabled={selected !== null}
            style={{
              padding: '20px',
              fontSize: '1.2rem',
              background: selected === i ? (q.correct === i ? '#4CAF50' : '#F44336') : '#e0e0e0',
              color: selected === i ? 'white' : '#333',
              border: 'none',
              borderRadius: '12px',
              cursor: selected === null ? 'pointer' : 'default'
            }}
          >
            {opt}
          </button>
        ))}
      </div>

      {feedback && <p style={{ marginTop: '30px', fontSize: '1.5rem', textAlign: 'center', color: feedback.includes('Correcto') ? '#4CAF50' : '#F44336' }}>{feedback}</p>}
    </div>
  );
}
