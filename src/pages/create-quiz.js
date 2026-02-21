import { useState } from 'react';
import { auth, db, realtimeDb } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import { ref, set } from 'firebase/database';
import QRCode from 'qrcode.react';
import { useRouter } from 'next/router';

export default function CreateQuiz() {
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState([
    { question: '', options: ['', '', '', ''], correct: 0 }
  ]);
  const [code, setCode] = useState('');
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

  const generateCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const saveAndGenerate = async () => {
    if (!auth.currentUser) {
      alert('Debes estar logueado');
      return;
    }

    const newCode = generateCode();
    setCode(newCode);

    try {
      // Guardar en Firestore (para lista de quizzes del creador)
      await addDoc(collection(db, 'quizzes'), {
        creatorId: auth.currentUser.uid,
        title,
        questions,
        code: newCode,
        createdAt: new Date()
      });

      // Guardar en Realtime DB (para el juego en vivo)
      await set(ref(realtimeDb, `games/${newCode}`), {
        title,
        questions,
        creator: auth.currentUser.uid,
        players: {},
        currentQuestion: -1,
        started: false
      });

      alert(`Quiz creado! Código: ${newCode}`);
    } catch (err) {
      console.error(err);
      alert('Error al guardar el quiz');
    }
  };

  return (
    <div style={{ padding: '40px', maxWidth: '700px', margin: '0 auto' }}>
      <h1>Crear Quiz</h1>

      <input
        type="text"
        placeholder="Título del quiz"
        value={title}
        onChange={e => setTitle(e.target.value)}
        style={{ width: '100%', padding: '12px', marginBottom: '20px', fontSize: '18px' }}
      />

      {questions.map((q, qIndex) => (
        <div key={qIndex} style={{ border: '1px solid #ddd', padding: '16px', marginBottom: '20px', borderRadius: '8px' }}>
          <input
            type="text"
            placeholder={`Pregunta ${qIndex + 1}`}
            value={q.question}
            onChange={e => updateQuestion(qIndex, 'question', e.target.value)}
            style={{ width: '100%', padding: '10px', marginBottom: '12px' }}
          />

          {q.options.map((opt, oIndex) => (
            <div key={oIndex} style={{ display: 'flex', marginBottom: '8px' }}>
              <input
                type="text"
                placeholder={`Opción ${oIndex + 1}`}
                value={opt}
                onChange={e => updateQuestion(qIndex, null, e.target.value, oIndex)}
                style={{ flex: 1, padding: '10px' }}
              />
              <input
                type="radio"
                name={`correct-${qIndex}`}
                checked={q.correct === oIndex}
                onChange={() => updateQuestion(qIndex, 'correct', oIndex)}
                style={{ marginLeft: '12px' }}
              />
            </div>
          ))}
        </div>
      ))}

      <button
        onClick={addQuestion}
        style={{ padding: '10px 20px', marginRight: '16px', background: '#9c27b0', color: 'white', border: 'none' }}
      >
        + Añadir pregunta
      </button>

      <button
        onClick={saveAndGenerate}
        style={{ padding: '10px 20px', background: '#4caf50', color: 'white', border: 'none' }}
      >
        Guardar y generar código
      </button>

      {code && (
        <div style={{ marginTop: '40px', textAlign: 'center' }}>
          <h3>Código del quiz: <strong>{code}</strong></h3>
          <div style={{ margin: '20px 0' }}>
            <QRCode value={`https://${window.location.host}/join?code=${code}`} size={180} />
          </div>
          <p>Comparte este código o QR para que otros se unan</p>
        </div>
      )}
    </div>
  );
}
