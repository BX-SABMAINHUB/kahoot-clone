// pages/join-quiz.js
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
  }, [router.query]);

  const joinGame = () => {
    const gameCode = code.trim().toUpperCase();
    if (!gameCode) return setError('Ingresa un código');

    setLoading(true);
    setError('');

    const gameRef = ref(realtimeDb, `games/${gameCode}`);

    onValue(gameRef, (snap) => {
      const game = snap.val();
      if (!game) {
        setError('Código inválido');
        setLoading(false);
        return;
      }

      if (game.started) {
        setError('El quiz ya comenzó');
        setLoading(false);
        return;
      }

      // Unirse
      update(ref(realtimeDb, `games/${gameCode}/players/${auth.currentUser.uid}`), {
        uid: auth.currentUser.uid,
        email: auth.currentUser.email,
        score: 0,
        answered: false,
        joinedAt: Date.now()
      }).then(() => {
        // Redirigir al juego
        router.push(`/play/${gameCode}`);
      }).catch(err => {
        setError('Error al unirse: ' + err.message);
        setLoading(false);
      });
    }, { onlyOnce: true });
  };

  return (
    <div style={{ padding: '60px 20px', maxWidth: '500px', margin: '0 auto', textAlign: 'center' }}>
      <h1>Unirse a Quiz</h1>

      <input
        type="text"
        placeholder="Código (6 caracteres)"
        value={code}
        onChange={e => setCode(e.target.value.toUpperCase())}
        maxLength={6}
        style={{ width: '100%', padding: '16px', fontSize: '1.6rem', textAlign: 'center', marginBottom: '30px' }}
      />

      <button 
        onClick={joinGame}
        disabled={loading || !code.trim()}
        style={{ padding: '16px 60px', fontSize: '1.4rem', background: loading ? '#aaa' : '#4CAF50', color: 'white' }}
      >
        {loading ? 'Uniéndose...' : 'Unirse'}
      </button>

      {error && <p style={{ color: 'red', marginTop: '20px' }}>{error}</p>}
    </div>
  );
}
