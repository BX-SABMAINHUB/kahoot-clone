import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { auth, realtimeDb } from '../firebase';
import { ref, onValue, update } from 'firebase/database';

export default function JoinQuiz() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (router.query.code) {
      setCode(router.query.code.toUpperCase());
    }
  }, [router.query.code]);

  const join = () => {
    const gameCode = code.trim().toUpperCase();
    if (!gameCode) return setError('Código obligatorio');

    setLoading(true);
    setError('');

    onValue(ref(realtimeDb, `games/${gameCode}`), (snap) => {
      const game = snap.val();
      if (!game) return setError('Código inválido'), setLoading(false);
      if (game.started) return setError('El quiz ya empezó'), setLoading(false);

      update(ref(realtimeDb, `games/${gameCode}/players/${auth.currentUser.uid}`), {
        uid: auth.currentUser.uid,
        email: auth.currentUser.email,
        score: 0,
        answered: false,
        joinedAt: Date.now()
      }).then(() => {
        // Redirección a play/[code]
        router.push(`/play/${gameCode}`);
      }).catch(err => {
        setError('Error al unirse: ' + err.message);
        setLoading(false);
      });
    }, { onlyOnce: true });
  };

  return (
    <div style={{ padding: '80px 20px', maxWidth: '500px', margin: '0 auto', textAlign: 'center' }}>
      <h1>Unirse a un Quiz</h1>

      <input
        type="text"
        placeholder="Código (6 caracteres)"
        value={code}
        onChange={e => setCode(e.target.value.toUpperCase())}
        maxLength={6}
        style={{ width: '100%', padding: '16px', fontSize: '1.6rem', textAlign: 'center', marginBottom: '30px' }}
      />

      <button
        onClick={join}
        disabled={loading || !code.trim()}
        style={{
          width: '100%',
          padding: '16px',
          fontSize: '1.4rem',
          background: loading ? '#aaa' : '#4CAF50',
          color: 'white',
          border: 'none',
          borderRadius: '10px',
          cursor: loading ? 'not-allowed' : 'pointer'
        }}
      >
        {loading ? 'Uniéndose...' : 'Unirse al Quiz'}
      </button>

      {error && <p style={{ color: 'red', marginTop: '20px', fontWeight: 'bold' }}>{error}</p>}
    </div>
  );
}
