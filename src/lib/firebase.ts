import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyD5H-94Q6-RkGEbHqS5KKPHf0npMiZPVbs',
  authDomain: 'quickfinancials-45539.firebaseapp.com',
  projectId: 'quickfinancials-45539',
  storageBucket: 'quickfinancials-45539.firebasestorage.app',
  messagingSenderId: '5261350372',
  appId: '1:5261350372:web:cace80e2f442370fd4a3f1'
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
