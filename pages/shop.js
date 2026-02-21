import { useState, useEffect } from 'react';
import { auth, db, realtimeDb } from '../firebase';
import { doc, onSnapshot, updateDoc, arrayUnion } from 'firebase/firestore';
import { useRouter } from 'next/router';

export default function Shop() {
  const [money, setMoney] = useState(0);
  const [characters, setCharacters] = useState(['default']);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    if (!auth.currentUser) {
      router.push('/');
      return;
    }

    const userRef = doc(db, 'users', auth.currentUser.uid);

    const unsubscribe = onSnapshot(userRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setMoney(data.money || 0);
        setCharacters(data.characters || ['default']);
      } else {
        // Si no existe, crea con valores iniciales
        updateDoc(userRef, { money: 0, characters: ['default'] });
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const buyPack = async () => {
    if (money < 5) {
      setError('No tienes suficientes monedas (necesitas 5)');
      return;
    }

    setError('');

    // Probabilidades simples de rareza
    const roll = Math.random();
    let rarity, newChar;

    if (roll < 0.60) {
      rarity = 'común';
      newChar = `personaje-comun-${Math.floor(Math.random() * 20) + 1}`;
    } else if (roll < 0.90) {
      rarity = 'raro';
      newChar = `personaje-raro-${Math.floor(Math.random() * 10) + 1}`;
    } else {
      rarity = 'épico';
      newChar = `personaje-epico-${Math.floor(Math.random() * 5) + 1}`;
    }

    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, {
        money: money - 5,
        characters: arrayUnion(newChar)
      });

      alert(`¡Sobre abierto! Obtuviste un personaje ${rarity}: ${newChar}`);
    } catch (err) {
      setError('Error al comprar: ' + err.message);
    }
  };

  if (loading) return <div style={{ padding: '100px', textAlign: 'center' }}>Cargando tienda...</div>;

  return (
    <div style={{ padding: '60px 24px', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
      <h1>Tienda de Sobres</h1>
      <p style={{ fontSize: '1.4rem', margin: '24px 0' }}>
        Monedas disponibles: <strong>{money}</strong>
      </p>

      <button
        onClick={buyPack}
        disabled={money < 5}
        style={{
          padding: '20px 60px',
          fontSize: '1.4rem',
          background: money >= 5 ? '#9c27b0' : '#ccc',
          color: 'white',
          border: 'none',
          borderRadius: '12px',
          cursor: money >= 5 ? 'pointer' : 'not-allowed',
          margin: '32px 0'
        }}
      >
        Comprar Sobre (5 monedas)
      </button>

      {error && <p style={{ color: 'red', fontSize: '1.2rem' }}>{error}</p>}

      <div style={{ marginTop: '60px' }}>
        <h2>Tus personajes desbloqueados</h2>
        <ul style={{ listStyle: 'none', padding: 0, marginTop: '20px' }}>
          {characters.map((char, i) => (
            <li key={i} style={{ 
              fontSize: '1.2rem', 
              margin: '12px 0', 
              padding: '12px', 
              background: '#f5f5f5', 
              borderRadius: '8px' 
            }}>
              {char}
            </li>
          ))}
        </ul>
      </div>

      <button 
        onClick={() => router.push('/dashboard')}
        style={{ 
          marginTop: '48px', 
          padding: '14px 32px', 
          background: '#2196f3', 
          color: 'white', 
          border: 'none', 
          borderRadius: '8px' 
        }}
      >
        Volver al menú
      </button>
    </div>
  );
}
