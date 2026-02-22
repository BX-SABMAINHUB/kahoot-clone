import { useState } from 'react';
import { auth, realtimeDb } from '../firebase'; // Asegúrate de que la ruta sea correcta (../firebase o ./firebase)
import { ref, set } from 'firebase/database';
import QRCode from 'qrcode.react';
import { useRouter } from 'next/router';

export default function CreateQuiz() {
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState([
    { question: '', options: ['', '', '', ''], correct: 0 }
  ]);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  // Función para agregar una nueva pregunta
  const addQuestion = () => {
    setQuestions([...questions, { question: '', options: ['', '', '', ''], correct: 0 }]);
  };

  // Actualizar pregunta u opción
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

  // Generar código único para el quiz
  const generateCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

  // Guardar quiz en Realtime Database
  const saveQuiz = async () => {
    if (!title.trim()) return setError('Pon un título al quiz');
    if (!auth.currentUser) return setError('Debes iniciar sesión para crear quizzes');

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
    <div style={{
      padding: '40px 20px',
      maxWidth: '900px',
      margin: '0 auto',
      background: 'linear-gradient(135deg, #f5f7fa, #c3cfe2)',
      minHeight: '100vh'
    }}>
      <h1 style={{ textAlign: 'center', color: '#333', marginBottom: '40px' }}>Crear Quiz</h1>

      {error && (
        <p style={{ color: 'red', textAlign: 'center', marginBottom: '20px' }}>{error}</p>
      )}

      <input
        type="text"
        placeholder="Título del quiz"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        style={{
          width: '100%',
          padding: '15px',
          marginBottom: '30px',
          borderRadius: '10px',
          border: '1px solid #ccc',
          fontSize: '1.2rem'
        }}
      />

      {questions.map((q, qIndex) => (
        <div key={qIndex} style={{
          background: 'white',
          padding: '20px',
          marginBottom: '25px',
          borderRadius: '12px',
          boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
        }}>
          <input
            placeholder={`Pregunta ${qIndex + 1}`}
            value={q.question}
            onChange={(e) => updateQuestion(qIndex, 'question', e.target.value)}
            style={{
              width: '100%',
              padding: '12px',
              marginBottom: '15px',
              borderRadius: '8px',
              border: '1px solid #ddd',
              fontSize: '1.1rem'
            }}
          />

          {q.options.map((opt, oIndex) => (
            <div key={oIndex} style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
              <input
                placeholder={`Opción ${oIndex + 1}`}
                value={opt}
                onChange={(e) => updateQuestion(qIndex, null, e.target.value, oIndex)}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #ddd',
                  marginRight: '10px'
                }}
              />
              <input
                type="radio"
                name={`correct-${qIndex}`}
                checked={q.correct === oIndex}
                onChange={() => updateQuestion(qIndex, 'correct', oIndex)}
                style={{ width: '20px', height: '20px' }}
              />
            </div>
          ))}
        </div>
      ))}

      <div style={{ textAlign: 'center', margin: '30px 0' }}>
        <button
          onClick={addQuestion}
          style={{
            padding: '12px 30px',
            marginRight: '20px',
            background: '#9b59b6',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            cursor: 'pointer',
            fontSize: '1.1rem'
          }}
        >
          + Añadir pregunta
        </button>

        <button
          onClick={saveQuiz}
          style={{
            padding: '12px 40px',
            background: '#27ae60',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            cursor: 'pointer',
            fontSize: '1.1rem'
          }}
        >
          Crear y generar código
        </button>
      </div>

      {code && (
        <div style={{ marginTop: '50px', textAlign: 'center' }}>
          <h2 style={{ color: '#2c3e50' }}>Código del quiz: <strong>{code}</strong></h2>
          <p style={{ margin: '20px 0', color: '#555' }}>Comparte este código o QR para que otros se unan</p>
          <div style={{ background: 'white', padding: '20px', borderRadius: '12px', display: 'inline-block' }}>
            <QRCode value={`http://localhost:3000/join-quiz?code=${code}`} size={200} />
          </div>
        </div>
      )}
    </div>
  );
}
