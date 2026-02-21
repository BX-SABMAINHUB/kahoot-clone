import { useState, useEffect } from 'react';
import { auth, db, realtimeDb } from '../firebase';
import { ref, onValue, update } from 'firebase/database';
import { useRouter } from 'next/router';

export default function JoinQuiz() {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Si viene ?code=XXXX desde QR o link directo, auto-llenar
  useEffect(() => {
    if (router.query.code) {
      setCode(router.query.code);
    }
  }, [router.query.code]);

  const handleJoin = () => {
    if (!code.trim()) {
      setError('Ingresa un código válido');
      return;
    }
    if (!auth.currentUser) {
      setError('Debes iniciar sesión primero');
      return;
    }

    setLoading(true);
    setError('');

    const gameRef = ref(realtimeDb, `games/${code.toUpperCase()}`);

    onValue(gameRef, (snapshot) => {
      const gameData = snapshot.val();

      if (!gameData) {
        setError('Código inválido o quiz no encontrado');
        setLoading(false);
        return;
      }

      if (gameData.started) {
        setError('El quiz ya empezó, no puedes unirte');
        setLoading(false);
        return;
      }

      // Unirse: agregar jugador al Realtime DB
      update(ref(realtimeDb, `games/${code}/players/${auth.currentUser.uid}`), {
        uid: auth.currentUser.uid,
        email: auth.currentUser.email,
        score: 0,
        answered: false,
        joinedAt: Date.now()
      }).then(() => {
        // Redirigir al lobby/juego
        router.push(`/play/${code}`);
      }).catch(err => {
        setError('Error al unirte: ' + err.message);
        setLoading(false);
      });
    }, { onlyOnce: true });
  };

  return (
    <div style={{ 
      maxWidth: '420px', 
      margin: '80px auto', 
      padding: '32px', 
      border: '1px solid #e0e0e0', 
      borderRadius: '12px', 
      boxShadow: '0 4px 12px rgba(0,0,0,0.08)' 
    }}>
      <h2 style={{ textAlign: 'center', marginBottom: '32px' }}>Unirse a un Quiz</h2>

      <input
        type="text"
        placeholder="Código del quiz (ej: ABC123)"
        value={code}
        onChange={e => setCode(e.target.value.toUpperCase())}
        style={{ 
          width: '100%', 
          padding: '14px', 
          marginBottom: '24px', 
          border: '1px solid #ccc', 
          borderRadius: '6px', 
          fontSize: '18px', 
          textTransform: 'uppercase' 
        }}
        maxLength={6}
      />

      <button 
        onClick={handleJoin}
        disabled={loading}
        style={{ 
          width: '100%', 
          padding: '14px', 
          background: '#4caf50', 
          color: 'white', 
          border: 'none', 
          borderRadius: '6px', 
          fontSize: '18px', 
          cursor: loading ? 'not-allowed' : 'pointer' 
        }}
      >
        {loading ? 'Uniéndose...' : 'Unirse al Quiz'}
      </button>

      {error && <p style={{ color: 'red', textAlign: 'center', marginTop: '20px' }}>{error}</p>}

      <p style={{ textAlign: 'center', marginTop: '32px', color: '#666' }}>
        Escanea el QR o ingresa el código que te compartieron
      </p>
    </div>
  );
}
