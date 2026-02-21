import { useEffect } from 'react';
import { auth } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

function MyApp({ Component, pageProps }) {
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        // Crear/actualizar documento del usuario si no existe
        const userRef = doc(db, 'users', user.uid);
        await setDoc(userRef, {
          email: user.email,
          money: 0,
          characters: ['default'],
          selectedCharacter: 'default'
        }, { merge: true });
      }
    });

    return () => unsubscribe();
  }, []);

  return <Component {...pageProps} />;
}

export default MyApp;
