// pages/create-quiz.js o src/pages/create-quiz.js
import { useState, useEffect } from 'react';
import { auth, realtimeDb } from '../firebase';
import { ref, set, onValue } from 'firebase/database';
import QRCode from 'qrcode.react';
import { useRouter } from 'next/router';

export default function CreateQuiz() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState([{ question: '', options: ['', '', '', ''], correct: 0 }]);
  const [code, setCode] = useState('');
  const [players, setPlayers] = useState({});
  const [error, setError] = useState('');

  // Dominio real (cámbialo por tu URL de GitHub Pages o Vercel)
  const BASE_URL = 'https://bx-sabmainhub.github.io/kahoot-clone';
  // Si usas Vercel en el futuro: const BASE_URL = 'https://tu-proyecto.vercel.app';

  useEffect(() => {
    if (!auth.currentUser) router.replace('/');
  }, [router]);

  const addQuestion = () => {
    setQuestions([...questions, { question: '', options: ['', '', '', ''], correct: 0 }]);
  };

  const updateQuestion = (qIndex, field, value, optIndex = null) => {
    const updated = [...questions];
    if (optIndex !== null) updated[qIndex].options[optIndex] = value;
    else if (field === 'correct') updated[qIndex].correct = Number(value);
    else updated[qIndex][field] = value;
    setQuestions(updated);
  };

  const createQuiz = async () => {
    if (!title.trim()) return setError('Título obligatorio');
    if (questions.some(q => !q.question.trim() || q.options.some(o => !o.trim()))) {
      return setError('Completa todas las preguntas y opciones');
    }

    const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
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
      onValue(ref(realtimeDb, `games/${newCode}/players`), (snap) => {
        setPlayers(snap.val() || {});
      });

      alert(`Quiz creado!\nCódigo: ${newCode}`);
    } catch (err) {
      setError(err.message);
    }
  };

  const startQuiz = async () => {
    if (!code) return;
    try {
      await update(ref(realtimeDb, `games/${code}`), { started: true, currentQuestion: 0 });
    } catch (err) {
      alert('Error al iniciar: ' + err.message);
    }
  };

  return (
    <div style={{ padding: '40px 20px', maxWidth: '900px', margin: '0 auto', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '40px' }}>Crear Quiz</h1>

      {error && <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>}

      {!code ? (
        <>
          <input
            placeholder="Título del quiz"
            value={title}
            onChange={e => setTitle(e.target.value)}
            style={{ width: '100%', padding: '12px', marginBottom: '30px', fontSize: '1.2rem' }}
          />

          {questions.map((q, i) => (
            <div key={i} style={{ marginBottom: '30px', padding: '20px', background: '#f8f9fa', borderRadius: '12px' }}>
              <input
                placeholder={`Pregunta ${i+1}`}
                value={q.question}
                onChange={e => updateQuestion(i, 'question', e.target.value)}
                style={{ width: '100%', padding: '12px', marginBottom: '15px' }}
              />
              {q.options.map((opt, oi) => (
                <div key={oi} style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
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

          <button onClick={addQuestion} style={{ marginRight: '15px', padding: '10px 20px' }}>
            + Pregunta
          </button>

          <button onClick={createQuiz} style={{ padding: '10px 30px', background: '#4CAF50', color: 'white' }}>
            Crear Quiz
          </button>
        </>
      ) : (
        <div style={{ textAlign: 'center' }}>
          <h2>Código: <strong style={{ fontSize: '3rem', color: '#d32f2f' }}>{code}</strong></h2>

          <div style={{ margin: '30px 0' }}>
            <QRCode value={`${BASE_URL}/join-quiz?code=${code}`} size={280} />
          </div>

          <p style={{ fontSize: '1.4rem', margin: '20px 0' }}>
            Comparte este código o QR
          </p>

          <h3>Jugadores ({Object.keys(players).length}):</h3>
          <div style={{ margin: '20px 0' }}>
            {Object.values(players).map(p => (
              <div key={p.uid} style={{ padding: '8px', background: '#e3f2fd', margin: '6px', borderRadius: '8px' }}>
                {p.email || p.uid.slice(0,8)}...
              </div>
            ))}
          </div>

          <button onClick={startQuiz} style={{ padding: '14px 60px', fontSize: '1.3rem', background: '#2196F3', color: 'white' }}>
            Empezar Quiz
          </button>
        </div>
      )}
    </div>
  );
}
