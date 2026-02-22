import { useState } from 'react'; // ← faltaba esta importación de useEffect
import { auth, realtimeDb } from '../firebase'; // Asegúrate de que la ruta sea correcta
import { ref, set } from 'firebase/database';
import QRCode from 'qrcode.react';

export default function CreateQuiz() {
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState([
    { question: '', options: ['', '', '', ''], correct: 0 }
  ]);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

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

  const saveQuiz = async () => {
    if (!title.trim()) return setError('Pon un título al quiz');
    if (!auth.currentUser) return setError('Debes iniciar sesión');

    const newCode = generateCode();
    setCode(newCode);
    setError('');

    try {
      await set(ref(realtimeDb, `games/${newCode}`), {
        title,
        creator: auth.currentUser.uid,
        questions,
        createdAt: Date.now(),
        players: {},
        currentQuestion: -1,
        started: false
      });
      alert(`¡Quiz creado! Código: ${newCode}`);
    } catch (err) {
      setError('Error al guardar: ' + err.message);
    }
  };

  return (
    <div style={{ padding: '40px 20px', maxWidth: '900px', margin: '0 auto' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '40px' }}>Crear Quiz</h1>

      {error && <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>}

      <input
        type="text"
        placeholder="Título del quiz"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        style={{ width: '100%', padding: '15px', marginBottom: '30px', borderRadius: '10px', border: '1px solid #ccc' }}
      />

      {questions.map((q, qIndex) => (
        <div key={qIndex} style={{ background: '#fff', padding: '20px', marginBottom: '25px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
          <input
            placeholder={`Pregunta ${qIndex + 1}`}
            value={q.question}
            onChange={(e) => updateQuestion(qIndex, 'question', e.target.value)}
            style={{ width: '100%', padding: '12px', marginBottom: '15px', borderRadius: '8px', border: '1px solid #ddd' }}
          />

          {q.options.map((opt, oIndex) => (
            <div key={oIndex} style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
              <input
                placeholder={`Opción ${oIndex + 1}`}
                value={opt}
                onChange={(e) => updateQuestion(qIndex, null, e.target.value, oIndex)}
                style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #ddd', marginRight: '10px' }}
              />
              <input
                type="radio"
                name={`correct-${qIndex}`}
                checked={q.correct === oIndex}
                onChange={() => updateQuestion(qIndex, 'correct', oIndex)}
              />
            </div>
          ))}
        </div>
      ))}

      <div style={{ textAlign: 'center', margin: '30px 0' }}>
        <button onClick={addQuestion} style={{ padding: '12px 30px', marginRight: '20px', background: '#9b59b6', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer' }}>
          + Añadir pregunta
        </button>
        <button onClick={saveQuiz} style={{ padding: '12px 40px', background: '#27ae60', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer' }}>
          Crear y generar código
        </button>
      </div>

      {code && (
        <div style={{ marginTop: '50px', textAlign: 'center' }}>
          <h2>Código del quiz: <strong>{code}</strong></h2>
          <QRCode value={`http://localhost:3000/join-quiz?code=${code}`} size={200} />
        </div>
      )}
    </div>
  );
}
