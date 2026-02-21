import { useState, useEffect } from 'react';
import { auth, db, realtimeDb } from '../firebase';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { useRouter } from 'next/router';

export default function Characters() {
  const [characters, setCharacters] = useState(['default']);
  const [selected, setSelected] = useState('default');
  const [loading, setLoading] = useState(true);
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
        setCharacters(data.characters || ['default']);
        setSelected(data.selectedCharacter || 'default');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const selectCharacter = async (char) => {
    if (!characters.includes(char)) return;

    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, { selectedCharacter: char });
      setSelected(char);
      alert(`Personaje seleccionado: ${char}`);
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  if (loading) return <div style={{ padding: '100px', textAlign: 'center' }}>Cargando personajes...</div>;

  return (
    <div style={{ padding: '60px 24px', maxWidth: '700px', margin: '0 auto', textAlign: 'center' }}>
      <h1>Mis Personajes</h1>
      <p style={{ fontSize: '1.2rem', marginBottom: '40px' }}>
        Selecciona tu personaje favorito (se mostrará en los quizzes)
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '24px' }}>
        {characters.map((char) => (
          <div
            key={char}
            onClick={() => selectCharacter(char)}
            style={{
              padding: '20px',
              border: selected === char ? '3px solid #4caf50' : '1px solid #ddd',
              borderRadius: '12px',
              background: selected === char ? '#e8f5e9' : '#f9f9f9',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <div style={{ 
              width: '100px', 
              height: '100px', 
              background: '#ccc', 
              borderRadius: '50%', 
              margin: '0 auto 12px' 
            }} />
            <h3 style={{ margin: '8px 0' }}>{char}</h3>
            {selected === char && <p style={{ color: '#4caf50', fontWeight: 'bold' }}>Seleccionado</p>}
          </div>
        ))}
      </div>

      <button 
        onClick={() => router.push('/shop')}
        style={{ 
          marginTop: '48px', 
          padding: '14px 40px', 
          background: '#9c27b0', 
          color: 'white', 
          border: 'none', 
          borderRadius: '8px', 
          fontSize: '1.1rem' 
        }}
      >
        Comprar más sobres
      </button>

      <button 
        onClick={() => router.push('/dashboard')}
        style={{ 
          marginTop: '24px', 
          padding: '14px 40px', 
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
