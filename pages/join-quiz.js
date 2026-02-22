import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { auth, realtimeDb } from '../firebase';
import { ref, onValue, update } from 'firebase/database';

export default function JoinQuiz() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Si viene código por URL (?code=XXXXXX)
  useEffect(() => {
    if (router.query.code) {
      setCode(router.query.code.toUpperCase());
    }
  }, [router.query.code]);

  const handleJoin = () => {
    const upperCode = code.trim().toUpperCase();
    if (!upperCode) {
      setError('Ingresa un código válido');
      return;
    }

    setLoading(true);
    setError('');

    const gameRef = ref(realtimeDb, `games/${upperCode}`);

    onValue(gameRef, (snapshot) => {
      const data = snapshot.val();

      if (!data) {
        setError('Código inválido o quiz no existe');
        setLoading(false);
        return;
      }

      if (data.started) {
        setError('El quiz ya ha empezado, no puedes unirte');
        setLoading(false);
        return;
      }

      // Unir al jugador
      const playerRef = ref(realtimeDb, `games/${upperCode}/players/${auth.currentUser.uid}`);
      update(playerRef, {
        uid: auth.currentUser.uid,
        email: auth.currentUser.email,
        score: 0,
        answered: false,
        joinedAt: Date.now()
      }).then(() => {
        // Redirigir al juego
        router.push(`/play/${upperCode}`);
      }).catch((err) => {
        setError('Error al unirse: ' + err.message);
        setLoading(false);
      });
    }, { onlyOnce: true });
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      background: 'linear-gradient(135deg, #667eea, #764ba2)',
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        padding: '50px',
        borderRadius: '20px',
        boxShadow: '0 15px 35px rgba(0,0,0,0.3)',
        maxWidth: '450px',
        width: '100%',
        textAlign: 'center'
      }}>
        <h1 style={{ marginBottom: '40px', color: '#2c3e50' }}>Unirse a un Quiz</h1>

        {error && (
          <p style={{ color: 'red', marginBottom: '20px', fontWeight: 'bold' }}>{error}</p>
        )}

        <input
          type="text"
          placeholder="Código del quiz (ej: ABC123)"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          maxLength={6}
          style={{
            width: '100%',
            padding: '18px',
            fontSize: '1.4rem',
            textAlign: 'center',
            border: '2px solid #ddd',
            borderRadius: '12px',
            marginBottom: '30px',
            textTransform: 'uppercase'
          }}
        />

        <button
          onClick={handleJoin}
          disabled={loading || !code.trim()}
          style={{
            width: '100%',
            padding: '18px',
            fontSize: '1.3rem',
            background: loading ? '#ccc' : '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'background 0.3s'
          }}
        >
          {loading ? 'Uniéndose...' : 'Unirse al Quiz'}
        </button>

        <p style={{ marginTop: '30px', color: '#777' }}>
          Introduce el código que te dio el creador del quiz
        </p>
      </div>
    </div>
  );
}
