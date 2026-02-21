import { useEffect } from 'react';
import { auth, db } from '../firebase';  // Solo una importación de db
import { doc, setDoc } from 'firebase/firestore';
import { useRouter } from 'next/router';

function MyApp({ Component, pageProps }) {
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        // Crear/actualizar usuario si no existe
        const userRef = doc(db, 'users', user.uid);
        await setDoc(userRef, {
          email: user.email,
          money: 0,
          characters: ['default'],
          selectedCharacter: 'default'
        }, { merge: true });
      } else {
        if (router.pathname !== '/') router.push('/');
      }
    });

    return () => unsubscribe();
  }, [router]);

  return <Component {...pageProps} />;
}

export default MyApp;
