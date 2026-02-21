import { useEffect } from 'react';
import { auth } from '../firebase';
import { useRouter } from 'next/router';

export default function Dashboard() {
  const router = useRouter();

  useEffect(() => {
    if (!auth.currentUser) {
      router.replace('/');
    }
  }, [router]);

  if (!auth.currentUser) return null;

  return (
    <div style={{ 
      padding: '60px 24px', 
      textAlign: 'center', 
      maxWidth: '600px', 
      margin: '0 auto' 
    }}>
      <h1 style={{ marginBottom: '16px', fontSize: '2.5rem' }}>
        ¡Bienvenido!
      </h1>
      <p style={{ 
        fontSize: '1.3rem', 
        marginBottom: '48px', 
        color: '#444' 
      }}>
        {auth.currentUser.email}
      </p>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
        gap: '24px',
        maxWidth: '800px',
        margin: '0 auto'
      }}>
        <button 
          onClick={() => router.push('/create-quiz')}
          style={{ 
            padding: '20px 32px', 
            fontSize: '1.2rem', 
            background: '#4caf50', 
            color: 'white', 
            border: 'none', 
            borderRadius: '12px', 
            cursor: 'pointer',
            boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
          }}
        >
          Crear Quiz
        </button>

        <button 
          onClick={() => router.push('/join-quiz')}
          style={{ 
            padding: '20px 32px', 
            fontSize: '1.2rem', 
            background: '#2196f3', 
            color: 'white', 
            border: 'none', 
            borderRadius: '12px', 
            cursor: 'pointer',
            boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
          }}
        >
          Unirse a un Quiz
        </button>

        <button 
          onClick={() => router.push('/shop')}
          style={{ 
            padding: '20px 32px', 
            fontSize: '1.2rem', 
            background: '#9c27b0', 
            color: 'white', 
            border: 'none', 
            borderRadius: '12px', 
            cursor: 'pointer',
            boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
          }}
        >
          Tienda / Sobres
        </button>

        <button 
          onClick={() => auth.signOut().then(() => router.replace('/'))}
          style={{ 
            padding: '20px 32px', 
            fontSize: '1.2rem', 
            background: '#e63946', 
            color: 'white', 
            border: 'none', 
            borderRadius: '12px', 
            cursor: 'pointer',
            boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
          }}
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
