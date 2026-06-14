import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyBb5foXZ2zja67TCwNem7LUOriOmnz4zQc",
  authDomain: "nossogranel-ca169.firebaseapp.com",
  projectId: "nossogranel-ca169",
  storageBucket: "nossogranel-ca169.firebasestorage.app",
  messagingSenderId: "288650925877",
  appId: "1:288650925877:web:eb4f37b50d1898d017de7c"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
