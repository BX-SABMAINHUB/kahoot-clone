// Importar las funciones necesarias de Firebase
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";

// Tu configuración real de Firebase (copiada de la consola)
const firebaseConfig = {
  apiKey: "AIzaSyD13N4-9MjTrmlPwGP7mves0Exje4v2ACw",
  authDomain: "kahoot-8529e.firebaseapp.com",
  databaseURL: "https://kahoot-8529e-default-rtdb.firebaseio.com",
  projectId: "kahoot-8529e",
  storageBucket: "kahoot-8529e.firebasestorage.app",
  messagingSenderId: "313414356056",
  appId: "1:313414356056:web:4aab4587f7df9393008e2d",
  measurementId: "G-8T4CPC1BQ3"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Exportar los servicios que usas en tu app
export const auth = getAuth(app);           // Autenticación (login/registro)
export const db = getFirestore(app);        // Cloud Firestore (si lo usas)
export const realtimeDb = getDatabase(app); // Realtime Database (para partidas en vivo)

// Opcional: Analytics (solo si lo necesitas, puedes borrarlo)
import { getAnalytics } from "firebase/analytics";
const analytics = getAnalytics(app);        // No lo exportamos si no lo usas
