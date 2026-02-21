// src/pages/play/[code].js
import { useState, useEffect } from 'react';
import { auth, realtimeDb, db } from '../../firebase';
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

  // Cargar datos del usuario (personaje seleccionado)
  useEffect(() => {
    if (!auth.currentUser) {
      router.push('/');
      return;
    }

    const userRef = doc(db, 'users', auth.currentUser.uid);
    const unsubscribeUser = onSnapshot(userRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setPlayerCharacter(data.selectedCharacter || 'default');
      }
    });

    return () => unsubscribeUser();
  }, [router]);

  // Escuchar el estado del juego en tiempo real
  useEffect(() => {
    if (!code || !auth.currentUser) return;

    setLoading(true);
    const gameRef = ref(realtimeDb, `games/${code}`);

    const unsubscribeGame = onValue(gameRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        setError('Este quiz no existe o fue eliminado');
        setLoading(false);
        return;
      }

      setGame(data);
      setCurrentQuestionIndex(data.currentQuestion ?? -1);

      // Datos del jugador actual
      const pData = data.players?.[auth.currentUser.uid] || {};
      setPlayerData(pData);

      // Detectar fin del juego y dar recompensa (solo si no se dio antes)
      if (data.ended && !pData.rewardGiven) {
        giveReward();
      }

      setLoading(false);
    });

    return () => unsubscribeGame();
  }, [code]);

  const giveReward = async () => {
    if (!auth.currentUser) return;

    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, {
        money: increment(10)
      });

      update(ref(realtimeDb, `games/${code}/players/${auth.currentUser.uid}`), {
        rewardGiven: true
      });

      setFeedback('¡Quiz terminado! +10 monedas recibidas 🎉');
    } catch (err) {
      console.error('Error al dar monedas:', err);
      setFeedback('Error al recibir recompensa');
    }
  };

  const handleAnswer = (optionIndex) => {
    if (!game || currentQuestionIndex < 0 || currentQuestionIndex >= game.questions.length) return;
    if (selectedOption !== null) return; // ya respondió

    setSelectedOption(optionIndex);

    const question = game.questions[currentQuestionIndex];
    const isCorrect = optionIndex === question.correct;

    // Actualizar puntuación del jugador
    update(ref(realtimeDb, `games/${code}/players/${auth.currentUser.uid}`), {
      score: increment(isCorrect ? 10 : 0),
      answered: true,
      lastAnswerCorrect: isCorrect
    });

    setFeedback(isCorrect ? '¡Correcto! +10 puntos' : 'Incorrecto...');
  };

  if (loading) {
    return <div style={{ padding: '100px', textAlign: 'center', fontSize: '1.3rem' }}>Cargando quiz...</div>;
  }

  if (error) {
    return <div style={{ padding: '100px', textAlign: 'center', color: 'red', fontSize: '1.3rem' }}>{error}</div>;
  }

  if (!game) {
    return <div style={{ padding: '100px', textAlign: 'center' }}>Esperando datos del juego...</div>;
  }

  // Pantalla de espera
  if (currentQuestionIndex === -1) {
    return (
      <div style={{ padding: '80px 24px', textAlign: 'center' }}>
        <h2>Esperando a que el host inicie el quiz...</h2>
        <p style={{ fontSize: '1.4rem', marginTop: '24px' }}>
          Código: <strong>{code}</strong>
        </p>
      </div>
    );
  }

  // Fin del quiz
  if (currentQuestionIndex >= game.questions.length || game.ended) {
    return (
      <div style={{ padding: '80px 24px', textAlign: 'center' }}>
        <h1 style={{ marginBottom: '32px' }}>¡Quiz terminado!</h1>
        <p style={{ fontSize: '1.6rem', marginBottom: '24px' }}>
          Tu puntuación final: <strong>{playerData?.score || 0} puntos</strong>
        </p>
        <p style={{ color: '#4caf50', fontSize: '1.4rem', marginBottom: '40px' }}>
          {feedback}
        </p>
        <button
          onClick={() => router.push('/dashboard')}
          style={{
            padding: '16px 48px',
            fontSize: '1.2rem',
            background: '#2196f3',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            cursor: 'pointer'
          }}
        >
          Volver al menú
        </button>
      </div>
    );
  }

  const question = game.questions[currentQuestionIndex];

  return (
    <div style={{ padding: '40px 24px', maxWidth: '800px', margin: '0 auto' }}>
      {/* Mostrar personaje seleccionado */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <p style={{ fontSize: '1.3rem', marginBottom: '12px' }}>
          Jugando como: <strong>{playerCharacter}</strong>
        </p>
        <div
          style={{
            width: '100px',
            height: '100px',
            background: '#ccc',
            borderRadius: '50%',
            margin: '0 auto 16px',
            border: '4px solid #4caf50',
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
          // Si quieres imagen real: backgroundImage: `url(/images/${playerCharacter}.png)`
        />

        <p style={{ fontSize: '1.2rem' }}>
          Puntuación actual: <strong>{playerData?.score || 0}</strong>
        </p>
      </div>

      <h2 style={{ textAlign: 'center', marginBottom: '24px' }}>
        Pregunta {currentQuestionIndex + 1} de {game.questions.length}
      </h2>

      <h3 style={{ textAlign: 'center', marginBottom: '32px', fontSize: '1.5rem' }}>
        {question.question}
      </h3>

      <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: '1fr 1fr' }}>
        {question.options.map((opt, index) => (
          <button
            key={index}
            onClick={() => handleAnswer(index)}
            disabled={selectedOption !== null}
            style={{
              padding: '20px',
              fontSize: '1.2rem',
              background:
                selectedOption === index
                  ? question.correct === index
                    ? '#4caf50'
                    : '#e63946'
                  : '#f0f0f0',
              color: selectedOption === index ? 'white' : 'black',
              border: 'none',
              borderRadius: '12px',
              cursor: selectedOption === null ? 'pointer' : 'default',
              transition: 'all 0.2s'
            }}
          >
            {opt}
          </button>
        ))}
      </div>

      {feedback && (
        <p
          style={{
            marginTop: '40px',
            textAlign: 'center',
            fontSize: '1.6rem',
            fontWeight: 'bold',
            color: feedback.includes('Correcto') ? '#4caf50' : '#e63946'
          }}
        >
          {feedback}
        </p>
      )}
    </div>
  );
}
