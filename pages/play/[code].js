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
  const [player, setPlayer] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(-1);
  const [selected, setSelected] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(true);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [showRoulette, setShowRoulette] = useState(false);
  const [prize, setPrize] = useState(null);
  const [cooldown, setCooldown] = useState(false);

  const TIME = 20;
  const [time, setTime] = useState(TIME);
  const [timerOn, setTimerOn] = useState(false);

  const isCreator = auth.currentUser && game?.creator === auth.currentUser.uid;

  useEffect(() => {
    if (!code || !auth.currentUser) return;

    setLoading(true);

    const gameRef = ref(realtimeDb, `games/${code}`);
    const playerRef = ref(realtimeDb, `games/${code}/players/${auth.currentUser.uid}`);

    const unsubGame = onValue(gameRef, snap => {
      const data = snap.val();
      if (!data) {
        setLoading(false);
        return;
      }
      setGame(data);
      setCurrentQuestionIndex(data.currentQuestion ?? -1);

      if (data.currentQuestion !== currentQuestionIndex && data.started) {
        setTime(TIME);
        setTimerOn(true);
        setSelected(null);
        setFeedback('');
      }

      if (data.ended && data.players?.[auth.currentUser.uid]?.answeredAll) {
        setShowRoulette(true);
      }

      setLoading(false);
    });

    const unsubPlayer = onValue(playerRef, snap => {
      setPlayer(snap.val() || {});
    });

    return () => {
      unsubGame();
      unsubPlayer();
    };
  }, [code, currentQuestionIndex]);

  useEffect(() => {
    if (!timerOn || time <= 0) return;

    const t = setInterval(() => {
      setTime(prev => {
        if (prev <= 1) {
          clearInterval(t);
          setTimerOn(false);
          setFeedback('¡Tiempo!');
          update(ref(realtimeDb, `games/${code}/players/${auth.currentUser.uid}`), { answered: true });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(t);
  }, [timerOn, time, code]);

  const answer = index => {
    if (selected !== null || time <= 0 || !game?.started) return;

    setSelected(index);

    const q = game.questions[currentQuestionIndex];
    const right = index === q.correct;

    right ? setCorrect(c => c + 1) : setWrong(w => w + 1);
    setFeedback(right ? 'Correcto' : 'Incorrecto');

    update(ref(realtimeDb, `games/${code}/players/${auth.currentUser.uid}`), {
      score: increment(right ? 10 : 0),
      answered: true,
      lastCorrect: right
    });
  };

  const endQuiz = async () => {
    const coins = correct * 10;
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, { money: increment(coins) });

      update(ref(realtimeDb, `games/${code}/players/${auth.currentUser.uid}`), {
        answeredAll: true,
        coinsEarned: coins
      });

      setFeedback(`¡Terminaste! +${coins} monedas`);
      setShowRoulette(true);
    } catch (e) {
      setError(e.message);
    }
  };

  const spin = async () => {
    if (cooldown) return setFeedback('Espera 5 horas');

    const prizes = Array(10).fill(0).concat(1000, 5000);
    const win = prizes[Math.floor(Math.random() * prizes.length)];

    setPrize(win);
    setCooldown(true);

    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, {
        lastRouletteSpin: Date.now(),
        money: increment(win)
      });
      setFeedback(`¡Ganaste ${win} monedas extra!`);
    } catch (e) {
      setError(e.message);
    }
  };

  if (loading) return <div style={{ padding: '100px', textAlign: 'center', fontSize: '2rem' }}>Cargando...</div>;

  if (!game?.started) {
    return (
      <div style={{ padding: '60px', textAlign: 'center' }}>
        <h1>Lobby - Código: {code}</h1>
        <p>Esperando al creador...</p>

        <h3>Jugadores ({Object.keys(game?.players || {}).length}):</h3>
        {Object.values(game?.players || {}).map(p => (
          <div key={p.uid} style={{ margin: '8px', padding: '8px', background: '#f0f0f0', borderRadius: '8px' }}>
            {p.email || p.uid.slice(0,8)} {p.uid === game.creator && '👑'}
          </div>
        ))}

        {isCreator && (
          <button
            onClick={() => update(ref(realtimeDb, `games/${code}`), { started: true, currentQuestion: 0 })}
            style={{ marginTop: '40px', padding: '16px 60px', fontSize: '1.4rem', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '12px' }}
          >
            Empezar Quiz
          </button>
        )}
      </div>
    );
  }

  if (currentQuestionIndex >= game.questions.length || game.ended) {
    return (
      <div style={{ padding: '60px', textAlign: 'center' }}>
        <h1>¡Quiz terminado!</h1>

        <p style={{ fontSize: '1.6rem', margin: '20px 0' }}>
          Aciertos: <strong>{correct}</strong> · Fallos: <strong>{wrong}</strong>
        </p>
        <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#388E3C' }}>
          Monedas: {correct * 10}
        </p>

        {showRoulette && !prize ? (
          <div style={{ margin: '40px 0' }}>
            <h2>Ruleta disponible</h2>
            <button
              onClick={spin}
              style={{ padding: '16px 60px', fontSize: '1.4rem', background: '#FF9800', color: 'white', border: 'none', borderRadius: '50px' }}
            >
              Girar
            </button>
          </div>
        ) : prize !== null ? (
          <div style={{ margin: '40px 0', fontSize: '1.8rem' }}>
            <h2>¡Ruleta!</h2>
            <p style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>
              {prize === 0 ? 'Nada 😅' : `¡+${prize} monedas! 🎉`}
            </p>
          </div>
        ) : null}

        <button
          onClick={() => router.push('/dashboard')}
          style={{ padding: '14px 50px', fontSize: '1.2rem', background: '#2196F3', color: 'white', border: 'none', borderRadius: '12px' }}
        >
          Volver
        </button>
      </div>
    );
  }

  const q = game.questions[currentQuestionIndex];

  return (
    <div style={{ padding: '40px 20px', maxWidth: '900px', margin: '0 auto' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '30px' }}>
        Pregunta {currentQuestionIndex + 1}/{game.questions.length}
      </h2>

      <h3 style={{ textAlign: 'center', marginBottom: '40px', fontSize: '1.5rem' }}>
        {q.question}
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {q.options.map((opt, i) => (
          <button
            key={i}
            onClick={() => handleAnswer(i)}
            disabled={selected !== null || time <= 0}
            style={{
              padding: '25px',
              fontSize: '1.3rem',
              background: selected === i
                ? (q.correct === i ? '#66BB6A' : '#EF5350')
                : '#E0E0E0',
              color: selected === i ? 'white' : '#333',
              border: 'none',
              borderRadius: '12px',
              cursor: selected === null && time > 0 ? 'pointer' : 'default'
            }}
          >
            {opt}
          </button>
        ))}
      </div>

      <p style={{ textAlign: 'center', marginTop: '40px', fontSize: '1.6rem', fontWeight: 'bold' }}>
        Tiempo: {time}s
      </p>

      {feedback && (
        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '1.8rem', color: feedback.includes('Correcto') ? '#4CAF50' : '#F44336' }}>
          {feedback}
        </p>
      )}
    </div>
  );
}
