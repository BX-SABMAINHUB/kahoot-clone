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
    <div style={{padding:'60px 24px', textAlign:'center'}}>
      <h1 style={{marginBottom:'16px'}}>Bienvenido</h1>
      <p style={{fontSize:'1.2rem', marginBottom:'48px', color:'#444'}}>
        {auth.currentUser.email}
      </p>

      <div style={{display:'flex', flexDirection:'column', gap:'20px', maxWidth:'360px', margin:'0 auto'}}>
        <button style={{padding:'16px', fontSize:'1.1rem', borderRadius:'8px'}}>
          Crear Quiz
        </button>
        <button style={{padding:'16px', fontSize:'1.1rem', borderRadius:'8px'}}>
          Unirse a un Quiz
        </button>
        <button
          onClick={() => auth.signOut().then(() => router.replace('/'))}
          style={{padding:'16px', fontSize:'1.1rem', background:'#e63946', color:'white', border:'none', borderRadius:'8px'}}
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
