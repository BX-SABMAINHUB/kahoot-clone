import { useState, useEffect } from 'react';
import { auth, realtimeDb, db } from '../../firebase';
import { ref, onValue, update } from 'firebase/database';
import { doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { useRouter } from 'next/router';

export default function PlayQuiz() {
  const router = useRouter();
  const { code } = router.query;

  const [game, setGame] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(-1);
  const [selectedOption, setSelectedOption] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!code || !auth.currentUser) return;

    const gameRef = ref(realtimeDb, `games/${code}`);

    onValue(gameRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        setError('Este quiz no existe');
        return;
      }

      setGame(data);
      setCurrentQuestionIndex(data.currentQuestion || -1);

      // Detectar fin del quiz y dar recompensa (solo una vez)
      if (data.ended && !data.players?.[auth.currentUser.uid]?.rewardGiven) {
        giveReward();
      }
    });
  }, [code]);

  const giveReward = async () => {
    if (!auth.currentUser) return;

    const userRef = doc(db, 'users', auth.currentUser.uid);

    try {
      // Crear usuario si no existe (por si acaso)
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        await setDoc(userRef, { money: 0, characters: ['default'] });
      }

      // +10 monedas
      await updateDoc(userRef, {
        money: increment(10)
      });

      // Marcar que ya se dio la recompensa para no repetir
      update(ref(realtimeDb, `games/${code}/players/${auth.currentUser.uid}`), {
        rewardGiven: true
      });

      setFeedback('¡Quiz terminado! +10 monedas recibidas 🎉');
    } catch (err) {
      console.error('Error al dar monedas:', err);
    }
  };

  const handleAnswer = (optionIndex) => {
    if (!game || currentQuestionIndex < 0 || currentQuestionIndex >= game.questions.length) return;
    if (selectedOption !== null) return;

    setSelectedOption(optionIndex);

    const question = game.questions[currentQuestionIndex];
    const isCorrect = optionIndex === question.correct;

    update(ref(realtimeDb, `games/${code}/players/${auth.currentUser.uid}`), {
      score: increment(isCorrect ? 10 : 0),
      answered: true,
      lastAnswerCorrect: isCorrect
    });

    setFeedback(isCorrect ? '¡Correcto! +10 puntos' : 'Incorrecto');
  };

  // Resto del render (igual que antes, pero con feedback de monedas)
  if (error) return <div style={{ padding: '60px', textAlign: 'center', color: 'red' }}>{error}</div>;
  if (!game) return <div style={{ padding: '60px', textAlign: 'center' }}>Cargando...</div>;

  if (currentQuestionIndex === -1) {
    return (
      <div style={{ padding: '60px', textAlign: 'center' }}>
        <h2>Esperando inicio del quiz...</h2>
        <p>Código: <strong>{code}</strong></p>
      </div>
    );
  }

  if (currentQuestionIndex >= game.questions.length || game.ended) {
    return (
      <div style={{ padding: '60px', textAlign: 'center' }}>
        <h1>¡Quiz terminado!</h1>
        <p style={{ fontSize: '1.4rem', margin: '20px 0' }}>
          Tu puntuación: <strong>{game.players?.[auth.currentUser.uid]?.score || 0} puntos</strong>
        </p>
        <p style={{ color: '#4caf50', fontSize: '1.3rem' }}>{feedback}</p>
        <button 
          onClick={() => router.push('/dashboard')}
          style={{ padding: '14px 40px', marginTop: '32px', background: '#2196f3', color: 'white', border: 'none', borderRadius: '8px', fontSize: '1.1rem' }}
        >
          Volver al menú
        </button>
      </div>
    );
  }

  const question = game.questions[currentQuestionIndex];

  return (
    <div style={{ padding: '40px', maxWidth: '700px', margin: '0 auto' }}>
      <h2>Pregunta {currentQuestionIndex + 1} de {game.questions.length}</h2>
      <h3 style={{ margin: '24px 0', fontSize: '1.4rem' }}>{question.question}</h3>

      <div style={{ display: 'grid', gap: '16px' }}>
        {question.options.map((opt, i) => (
          <button
            key={i}
            onClick={() => handleAnswer(i)}
            disabled={selectedOption !== null}
            style={{
              padding: '16px',
              fontSize: '1.1rem',
              background: selectedOption === i 
                ? (question.correct === i ? '#4caf50' : '#e63946') 
                : '#f5f5f5',
              color: selectedOption === i ? 'white' : 'black',
              border: 'none',
              borderRadius: '8px',
              cursor: selectedOption === null ? 'pointer' : 'default'
            }}
          >
            {opt}
          </button>
        ))}
      </div>

      {feedback && <p style={{ marginTop: '32px', textAlign: 'center', fontSize: '1.4rem', color: feedback.includes('Correcto') ? '#4caf50' : '#e63946' }}>{feedback}</p>}

      <p style={{ textAlign: 'center', marginTop: '32px', fontSize: '1.1rem' }}>
        Tu puntuación: {game.players?.[auth.currentUser.uid]?.score || 0}
      </p>
    </div>
  );
}
