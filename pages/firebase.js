import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyD13N4-9MjTrmlPwGP7mves0Exje4v2ACw",
  authDomain: "kahoot-8529e.firebaseapp.com",
  projectId: "kahoot-8529e",
  storageBucket: "kahoot-8529e.firebasestorage.app",
  messagingSenderId: "313414356056",
  appId: "1:313414356056:web:7bd942fdee7594b9008e2d",
  measurementId: "G-RWCN82JHSF",
  databaseURL: "https://kahoot-8529e-default-rtdb.firebaseio.com/"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const realtimeDb = getDatabase(app);
