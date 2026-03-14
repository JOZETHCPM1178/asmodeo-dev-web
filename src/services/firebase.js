// src/services/firebase.js
// ════════════════════════════════════════
//  FIREBASE SERVICE — Punto central de Firebase
// ════════════════════════════════════════
import { initializeApp } from 'firebase/app'
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
} from 'firebase/auth'
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  deleteDoc,
  updateDoc,
  setDoc,
  serverTimestamp,
  query,
  orderBy,
  where,
  increment,
  onSnapshot,
  limit,
  startAfter,
  arrayUnion,
  arrayRemove,
  getCountFromServer,
  writeBatch,
} from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)

// Re-exportar todo lo que necesitamos en un solo lugar
export {
  // Auth
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  // Firestore
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  deleteDoc,
  updateDoc,
  setDoc,
  serverTimestamp,
  query,
  orderBy,
  where,
  increment,
  onSnapshot,
  limit,
  startAfter,
  arrayUnion,
  arrayRemove,
  getCountFromServer,
  writeBatch,
}

export default app
