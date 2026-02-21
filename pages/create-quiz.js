import { useState } from 'react';
import { auth, db, realtimeDb } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import { ref, set, update, onValue } from 'firebase/database';
import QRCode from 'qrcode.react';
import { useRouter } from 'next/router';

export default function CreateQuiz() {
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState([
    { question: '', options: ['', '', '', ''], correct: 0 }
  ]);
  const [code, setCode] = useState('');
  const [gameStatus, setGameStatus] = useState('created'); // created / started / ended
  const router = useRouter();

  const addQuestion = () => {
    setQuestions([...questions, { question: '', options: ['', '', '', ''], correct: 0 }]);
  };

  const updateQuestion = (index, field, value, optIndex = null) => {
    const newQuestions = [...questions];
    if (optIndex !== null) {
      newQuestions[index].options[optIndex] = value;
    } else if (field === 'correct') {
      newQuestions[index].correct = parseInt(value);
    } else {
      newQuestions[index][field] = value;
    }
    setQuestions(newQuestions);
  };

  const generateCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

  const saveQuiz = async () => {
    if (!auth.currentUser) return alert('Debes estar logueado');

    const newCode = generateCode();
    setCode(newCode);

    try {
      await addDoc(collection(db, 'quizzes'), {
        creatorId: auth.currentUser.uid,
        title,
        questions,
        code: newCode,
        createdAt: new Date()
      });

      await set(ref(realtimeDb, `games/${newCode}`), {
        title,
        questions,
        creator: auth.currentUser.uid,
        players: {},
        currentQuestion: -1,
        started: false,
        ended: false
      });

      alert(`Quiz creado! Código: ${newCode}`);
    } catch (err) {
      console.error(err);
      alert('Error al guardar');
    }
  };

  const startQuiz = () => {
    if (!code) return alert('Primero guarda el quiz');
    update(ref(realtimeDb, `games/${code}`), { started: true, currentQuestion: 0 });
    setGameStatus('started');
  };

  const nextQuestion = () => {
    const nextIndex = currentQuestion + 1;
    if (nextIndex >= questions.length) {
      update(ref(realtimeDb, `games/${code}`), { ended: true });
      setGameStatus('ended');
    } else {
      update(ref(realtimeDb, `games/${code}`), { currentQuestion: nextIndex });
    }
  };

  // Escuchar estado en tiempo real
  useEffect(() => {
    if (!code) return;
    const gameRef = ref(realtimeDb, `games/${code}`);
    onValue(gameRef, (snap) => {
      const data = snap.val();
      if (data) {
        setGameStatus(data.started ? (data.ended ? 'ended' : 'started') : 'created');
      }
    });
  }, [code]);

  let currentQuestion = gameStatus === 'started' ? questions[currentQuestionIndex] : null;

  return (
    <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Crear y Gestionar Quiz</h1>

      {!code ? (
        <>
          <input
            type="text"
            placeholder="Título del quiz"
            value={title}
            onChange={e => setTitle(e.target.value)}
            style={{ width: '100%', padding: '12px', marginBottom: '20px' }}
          />

          {questions.map((q, i) => (
            <div key={i} style={{ border: '1px solid #ccc', padding: '16px', marginBottom: '16px', borderRadius: '8px' }}>
              <input
                placeholder={`Pregunta ${i + 1}`}
                value={q.question}
                onChange={e => updateQuestion(i, 'question', e.target.value)}
                style={{ width: '100%', padding: '10px', marginBottom: '12px' }}
              />
              {q.options.map((opt, oi) => (
                <div key={oi} style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                  <input
                    placeholder={`Opción ${oi + 1}`}
                    value={opt}
                    onChange={e => updateQuestion(i, null, e.target.value, oi)}
                    style={{ flex: 1, padding: '10px' }}
                  />
                  <input
                    type="radio"
                    name={`correct-${i}`}
                    checked={q.correct === oi}
                    onChange={() => updateQuestion(i, 'correct', oi)}
                    style={{ marginLeft: '12px' }}
                  />
                </div>
              ))}
            </div>
          ))}

          <button onClick={addQuestion} style={{ padding: '10px 20px', marginRight: '16px', background: '#673ab7', color: 'white' }}>
            + Pregunta
          </button>

          <button onClick={saveQuiz} style={{ padding: '10px 20px', background: '#4caf50', color: 'white' }}>
            Guardar y generar código
          </button>
        </>
      ) : (
        <div style={{ textAlign: 'center' }}>
          <h2>Código: <strong>{code}</strong></h2>
          <div style={{ margin: '20px 0' }}>
            <QRCode value={`${window.location.origin}/join-quiz?code=${code}`} size={200} />
          </div>

          {gameStatus === 'created' && (
            <button onClick={startQuiz} style={{ padding: '16px 40px', background: '#ff9800', color: 'white', fontSize: '1.2rem' }}>
              Iniciar Quiz
            </button>
          )}

          {gameStatus === 'started' && (
            <div>
              <h3>Pregunta actual: {currentQuestionIndex + 1} / {questions.length}</h3>
              <button onClick={nextQuestion} style={{ padding: '16px 40px', background: '#2196f3', color: 'white', fontSize: '1.2rem' }}>
                Siguiente pregunta
              </button>
            </div>
          )}

          {gameStatus === 'ended' && <h3 style={{ color: 'green' }}>Quiz finalizado</h3>}
        </div>
      )}
    </div>
  );
}
