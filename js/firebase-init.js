// js/firebase-init.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, getDoc, doc, deleteDoc, updateDoc, setDoc, serverTimestamp, query, orderBy, where, increment } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyC4ubClTMdyw1kqtE38BtqIkeKuRgDuzyU",
  authDomain: "modzone-asmodeo.firebaseapp.com",
  projectId: "modzone-asmodeo",
  storageBucket: "modzone-asmodeo.firebasestorage.app",
  messagingSenderId: "754848736365",
  appId: "1:754848736365:web:78001b8718618a3852cb64"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

window._fb = {
  auth, db,
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, updateProfile, GoogleAuthProvider, signInWithPopup,
  collection, addDoc, getDocs, getDoc, doc, deleteDoc,
  updateDoc, setDoc, serverTimestamp, query, orderBy, where, increment
};

onAuthStateChanged(auth, async (user) => {
  if (user) {
    try {
      const snap = await getDoc(doc(db, "users", user.uid));
      const role = snap.exists() ? snap.data().role : (user.email === window.ADMIN_EMAIL ? "admin" : "user");
      window._currentUser = { ...user, role, isAdmin: role === "admin" };
    } catch {
      window._currentUser = { ...user, role: "user", isAdmin: user.email === window.ADMIN_EMAIL };
    }
  } else {
    window._currentUser = null;
  }
  window.dispatchEvent(new Event("authchange"));
});
