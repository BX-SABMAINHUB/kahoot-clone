// pages/create-quiz.js
import { useState, useEffect } from 'react';
import { auth, realtimeDb } from '../firebase';
import { ref, set, onValue } from 'firebase/database';
import QRCode from 'qrcode.react';
import { useRouter } from 'next/router';

export default function CreateQuiz() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState([
    { question: '', options: ['', '', '', ''], correct: 0 }
  ]);
  const [code, setCode] = useState('');
  const [players, setPlayers] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // URL pública (cámbiala por tu dominio real cuando despliegues)
  const BASE_URL = typeof window !== 'undefined' 
    ? window.location.origin 
    : 'https://bx-sabmainhub.github.io/kahoot-clone';

  useEffect(() => {
    if (!auth.currentUser) {
      router.replace('/');
    }
  }, [router]);

  const addQuestion = () => {
    setQuestions([...questions, { question: '', options: ['', '', '', ''], correct: 0 }]);
  };

  const updateQuestion = (qIndex, field, value, optIndex = null) => {
    const newQuestions = [...questions];
    if (optIndex !== null) {
      newQuestions[qIndex].options[optIndex] = value;
    } else if (field === 'correct') {
      newQuestions[qIndex].correct = Number(value);
    } else {
      newQuestions[qIndex][field] = value;
    }
    setQuestions(newQuestions);
  };

  const generateCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

  const createQuiz = async () => {
    if (!title.trim()) return setError('Pon un título');
    if (questions.some(q => !q.question.trim() || q.options.some(o => !o.trim()))) {
      return setError('Completa todas las preguntas y opciones');
    }

    setLoading(true);
    setError('');

    const newCode = generateCode();
    setCode(newCode);

    try {
      await set(ref(realtimeDb, `games/${newCode}`), {
        title,
        creator: auth.currentUser.uid,
        creatorEmail: auth.currentUser.email,
        questions,
        createdAt: Date.now(),
        players: {},
        currentQuestion: -1,
        started: false,
        ended: false
      });

      // Escuchar jugadores en tiempo real
      const playersRef = ref(realtimeDb, `games/${newCode}/players`);
      onValue(playersRef, (snap) => {
        setPlayers(snap.val() || {});
      });

      alert(`Quiz creado! Código: ${newCode}`);
    } catch (err) {
      setError('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const startQuiz = async () => {
    if (!code) return;

    try {
      await update(ref(realtimeDb, `games/${code}`), {
        started: true,
        currentQuestion: 0
      });
      alert('¡Quiz iniciado!');
    } catch (err) {
      alert('Error al iniciar: ' + err.message);
    }
  };

  return (
    <div style={{ padding: '40px 20px', maxWidth: '1000px', margin: '0 auto' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '40px' }}>Crear Quiz</h1>

      {error && <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>}

      {!code ? (
        <>
          <input
            type="text"
            placeholder="Título del quiz"
            value={title}
            onChange={e => setTitle(e.target.value)}
            style={{ width: '100%', padding: '15px', marginBottom: '30px', fontSize: '1.2rem' }}
          />

          {questions.map((q, i) => (
            <div key={i} style={{ marginBottom: '30px', padding: '20px', background: '#f9f9f9', borderRadius: '12px' }}>
              <input
                placeholder={`Pregunta ${i+1}`}
                value={q.question}
                onChange={e => updateQuestion(i, 'question', e.target.value)}
                style={{ width: '100%', padding: '12px', marginBottom: '15px' }}
              />
              {q.options.map((opt, oi) => (
                <div key={oi} style={{ display: 'flex', marginBottom: '10px' }}>
                  <input
                    placeholder={`Opción ${oi+1}`}
                    value={opt}
                    onChange={e => updateQuestion(i, null, e.target.value, oi)}
                    style={{ flex: 1, padding: '12px', marginRight: '10px' }}
                  />
                  <input
                    type="radio"
                    checked={q.correct === oi}
                    onChange={() => updateQuestion(i, 'correct', oi)}
                  />
                </div>
              ))}
            </div>
          ))}

          <button onClick={addQuestion} style={{ marginRight: '20px', padding: '12px 30px' }}>
            + Pregunta
          </button>

          <button 
            onClick={createQuiz} 
            disabled={loading}
            style={{ padding: '12px 40px', background: loading ? '#ccc' : '#4CAF50', color: 'white' }}
          >
            {loading ? 'Creando...' : 'Crear Quiz'}
          </button>
        </>
      ) : (
        <div style={{ textAlign: 'center' }}>
          <h2>Código del quiz: <strong style={{ fontSize: '3rem' }}>{code}</strong></h2>
          
          <div style={{ margin: '30px 0' }}>
            <QRCode 
              value={`${BASE_URL}/join-quiz?code=${code}`} 
              size={280} 
            />
          </div>

          <p style={{ fontSize: '1.3rem', marginBottom: '20px' }}>
            Comparte este código o QR con tus jugadores
          </p>

          <h3>Jugadores conectados ({Object.keys(players).length})</h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {Object.values(players).map(p => (
              <li key={p.uid} style={{ fontSize: '1.2rem', margin: '8px 0' }}>
                {p.email || p.uid.substring(0,8)}...
              </li>
            ))}
          </ul>

          <button 
            onClick={startQuiz}
            style={{ 
              marginTop: '40px', 
              padding: '16px 60px', 
              fontSize: '1.4rem', 
              background: '#2196F3', 
              color: 'white' 
            }}
          >
            Empezar Quiz
          </button>
        </div>
      )}
    </div>
  );
}
