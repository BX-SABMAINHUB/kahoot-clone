import { useState, useEffect } from 'react';
import { auth, realtimeDb } from '../../firebase';
import { ref, onValue, update } from 'firebase/database';
import { useRouter } from 'next/router';

export default function PlayQuiz() {
  const router = useRouter();
  const { code } = router.query; // el código viene de la URL: /play/ABC123

  const [game, setGame] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(-1);
  const [selectedOption, setSelectedOption] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!code || !auth.currentUser) return;

    const gameRef = ref(realtimeDb, `games/${code}`);

    const unsubscribe = onValue(gameRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        setError('Este quiz no existe o fue eliminado');
        return;
      }

      setGame(data);
      setCurrentQuestionIndex(data.currentQuestion || -1);

      // Si el juego terminó
      if (data.currentQuestion >= data.questions.length) {
        setFeedback('¡El quiz ha terminado!');
      }
    });

    return () => unsubscribe();
  }, [code]);

  const handleAnswer = (optionIndex) => {
    if (!game || currentQuestionIndex < 0 || currentQuestionIndex >= game.questions.length) return;
    if (selectedOption !== null) return; // ya respondió

    setSelectedOption(optionIndex);

    const question = game.questions[currentQuestionIndex];
    const isCorrect = optionIndex === question.correct;

    // Actualizar score del jugador en Realtime DB
    const playerRef = ref(realtimeDb, `games/${code}/players/${auth.currentUser.uid}`);
    update(playerRef, {
      score: (game.players?.[auth.currentUser.uid]?.score || 0) + (isCorrect ? 10 : 0),
      answered: true,
      lastAnswerCorrect: isCorrect
    });

    setFeedback(isCorrect ? '¡Correcto! +10 puntos' : 'Incorrecto...');
  };

  if (error) {
    return <div style={{ padding: '60px', textAlign: 'center', color: 'red' }}>{error}</div>;
  }

  if (!game) {
    return <div style={{ padding: '60px', textAlign: 'center' }}>Cargando quiz...</div>;
  }

  if (currentQuestionIndex === -1) {
    return (
      <div style={{ padding: '60px', textAlign: 'center' }}>
        <h2>Esperando a que el creador inicie el quiz...</h2>
        <p>Código: <strong>{code}</strong></p>
      </div>
    );
  }

  if (currentQuestionIndex >= game.questions.length) {
    return (
      <div style={{ padding: '60px', textAlign: 'center' }}>
        <h1>¡Quiz terminado!</h1>
        <p>Tu puntuación final: {game.players?.[auth.currentUser.uid]?.score || 0} puntos</p>
        <button 
          onClick={() => router.push('/dashboard')}
          style={{ padding: '14px 32px', marginTop: '24px', background: '#4caf50', color: 'white', border: 'none', borderRadius: '8px' }}
        >
          Volver al dashboard
        </button>
      </div>
    );
  }

  const question = game.questions[currentQuestionIndex];

  return (
    <div style={{ padding: '40px', maxWidth: '700px', margin: '0 auto' }}>
      <h2>Pregunta {currentQuestionIndex + 1} de {game.questions.length}</h2>
      <h3 style={{ margin: '24px 0' }}>{question.question}</h3>

      <div style={{ display: 'grid', gap: '16px' }}>
        {question.options.map((opt, index) => (
          <button
            key={index}
            onClick={() => handleAnswer(index)}
            disabled={selectedOption !== null}
            style={{
              padding: '16px',
              fontSize: '1.1rem',
              background: selectedOption === index 
                ? (question.correct === index ? '#4caf50' : '#e63946') 
                : '#f0f0f0',
              color: selectedOption === index ? 'white' : 'black',
              border: 'none',
              borderRadius: '8px',
              cursor: selectedOption === null ? 'pointer' : 'default'
            }}
          >
            {opt}
          </button>
        ))}
      </div>

      {feedback && (
        <p style={{ 
          marginTop: '32px', 
          textAlign: 'center', 
          fontSize: '1.3rem', 
          color: feedback.includes('Correcto') ? '#4caf50' : '#e63946' 
        }}>
          {feedback}
        </p>
      )}

      <p style={{ textAlign: 'center', marginTop: '32px' }}>
        Tu puntuación actual: {game.players?.[auth.currentUser.uid]?.score || 0}
      </p>
    </div>
  );
}
