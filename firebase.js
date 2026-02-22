// firebase.js (en la raíz o en lib/ según tu estructura)
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyD13N4-9MjTrmlPwGP7mves0Exje4v2ACw",
  authDomain: "kahoot-8529e.firebaseapp.com",
  databaseURL: "https://kahoot-8529e-default-rtdb.firebaseio.com",
  projectId: "kahoot-8529e",
  storageBucket: "kahoot-8529e.appspot.com",
  messagingSenderId: "313414356056",
  appId: "1:313414356056:web:4aab4587f7df9393008e2d",
  measurementId: "G-8T4CPC1BQ3"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const realtimeDb = getDatabase(app);
