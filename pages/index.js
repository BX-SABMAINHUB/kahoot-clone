import { useState, useEffect } from 'react';
import { auth, db, realtimeDb } from '../firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged
} from 'firebase/auth';
import { useRouter } from 'next/router';

export default function Home() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, user => {
      if (user) router.push('/dashboard');
    });
    return () => unsubscribe();
  }, [router]);

  const handleRegister = async () => {
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={{maxWidth:'420px', margin:'80px auto', padding:'32px', border:'1px solid #e0e0e0', borderRadius:'12px', boxShadow:'0 4px 12px rgba(0,0,0,0.08)'}}>
      <h2 style={{textAlign:'center', marginBottom:'32px'}}>Kahoot Clone</h2>

      <input
        type="email"
        placeholder="Correo electrónico"
        value={email}
        onChange={e => setEmail(e.target.value)}
        style={{width:'100%', padding:'14px', marginBottom:'16px', border:'1px solid #ccc', borderRadius:'6px', fontSize:'16px'}}
      />

      <input
        type="password"
        placeholder="Contraseña"
        value={password}
        onChange={e => setPassword(e.target.value)}
        style={{width:'100%', padding:'14px', marginBottom:'24px', border:'1px solid #ccc', borderRadius:'6px', fontSize:'16px'}}
      />

      <div style={{display:'flex', gap:'16px', justifyContent:'center'}}>
        <button
          onClick={handleRegister}
          style={{padding:'12px 32px', background:'#4caf50', color:'white', border:'none', borderRadius:'6px', cursor:'pointer', fontSize:'16px'}}
        >
          Registrarse
        </button>
        <button
          onClick={handleLogin}
          style={{padding:'12px 32px', background:'#2196f3', color:'white', border:'none', borderRadius:'6px', cursor:'pointer', fontSize:'16px'}}
        >
          Iniciar sesión
        </button>
      </div>

      {error && <p style={{color:'red', textAlign:'center', marginTop:'20px'}}>{error}</p>}
    </div>
  );
}
