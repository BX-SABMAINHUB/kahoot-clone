import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { auth, realtimeDb } from '../firebase'; // Ajusta la ruta si es necesario
import { ref, set } from 'firebase/database';
import QRCode from 'qrcode.react';

export default function CreateQuiz() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState([
    { question: '', options: ['', '', '', ''], correct: 0 }
  ]);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Proteger la página: solo usuarios logueados
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.replace('/');
      }
    });
    return () => unsubscribe();
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

  const saveQuiz = async () => {
    if (!title.trim()) {
      setError('El título es obligatorio');
      return;
    }

    if (questions.some(q => !q.question.trim() || q.options.some(opt => !opt.trim()))) {
      setError('Todas las preguntas y opciones deben estar completas');
      return;
    }

    setLoading(true);
    setError('');
    setCode('');

    const newCode = generateCode();

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

      setCode(newCode);
      alert(`¡Quiz creado correctamente!\nCódigo: ${newCode}`);
    } catch (err) {
      console.error(err);
      setError('Error al guardar el quiz: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '40px 20px',
      color: '#fff'
    }}>
      <div style={{
        maxWidth: '900px',
        margin: '0 auto',
        background: 'rgba(255,255,255,0.95)',
        borderRadius: '16px',
        padding: '40px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
        color: '#333'
      }}>
        <h1 style={{ textAlign: 'center', marginBottom: '40px', color: '#2c3e50' }}>
          Crear Nuevo Quiz
        </h1>

        {error && (
          <div style={{
            background: '#ffebee',
            color: '#c62828',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '20px',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        <input
          type="text"
          placeholder="Título del Quiz"
          value={title}
          onChange={e => setTitle(e.target.value)}
          style={{
            width: '100%',
            padding: '16px',
            fontSize: '1.3rem',
            border: '2px solid #ddd',
            borderRadius: '12px',
            marginBottom: '30px'
          }}
        />

        {questions.map((q, qIndex) => (
          <div key={qIndex} style={{
            background: '#f8f9fa',
            padding: '24px',
            borderRadius: '12px',
            marginBottom: '30px',
            border: '1px solid #e0e0e0'
          }}>
            <input
              placeholder={`Pregunta ${qIndex + 1}`}
              value={q.question}
              onChange={e => updateQuestion(qIndex, 'question', e.target.value)}
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '1.1rem',
                border: '1px solid #ccc',
                borderRadius: '10px',
                marginBottom: '20px'
              }}
            />

            {q.options.map((opt, oIndex) => (
              <div key={oIndex} style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '12px'
              }}>
                <input
                  placeholder={`Opción ${oIndex + 1}`}
                  value={opt}
                  onChange={e => updateQuestion(qIndex, null, e.target.value, oIndex)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    fontSize: '1rem',
                    border: '1px solid #ccc',
                    borderRadius: '10px',
                    marginRight: '12px'
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
              padding: '14px 32px',
              marginRight: '20px',
              background: '#7e57c2',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '1.1rem',
              cursor: 'pointer'
            }}
          >
            + Añadir Pregunta
          </button>

          <button
            onClick={saveQuiz}
            disabled={loading}
            style={{
              padding: '14px 40px',
              background: loading ? '#ccc' : '#4caf50',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '1.1rem',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Guardando...' : 'Crear Quiz'}
          </button>
        </div>

        {code && (
          <div style={{
            marginTop: '50px',
            padding: '30px',
            background: '#e8f5e9',
            borderRadius: '16px',
            textAlign: 'center'
          }}>
            <h2 style={{ color: '#2e7d32', marginBottom: '20px' }}>
              ¡Quiz creado con éxito!
            </h2>
            <p style={{ fontSize: '1.4rem', marginBottom: '15px' }}>
              Código para compartir: <strong style={{ fontSize: '2rem', color: '#c62828' }}>{code}</strong>
            </p>
            <QRCode value={`http://localhost:3000/join-quiz?code=${code}`} size={220} />
            <p style={{ marginTop: '20px', color: '#555' }}>
              Los jugadores pueden unirse escaneando el QR o usando el código directamente.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
