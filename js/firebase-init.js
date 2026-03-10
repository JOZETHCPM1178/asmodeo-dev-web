// js/firebase-init.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile, GoogleAuthProvider, signInWithPopup, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, getDoc, doc, deleteDoc, updateDoc, setDoc, serverTimestamp, query, orderBy, where, increment, onSnapshot, limit } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

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
const storage = getStorage(app);

window._fb = {
  auth, db, storage,
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, updateProfile, GoogleAuthProvider, signInWithPopup, sendPasswordResetEmail,
  collection, addDoc, getDocs, getDoc, doc, deleteDoc,
  updateDoc, setDoc, serverTimestamp, query, orderBy, where, increment,
  onSnapshot, limit, ref, uploadBytes, getDownloadURL
};

onAuthStateChanged(auth, async (user) => {
  if (user) {
    try {
      const snap = await getDoc(doc(db, "users", user.uid));
      const data = snap.exists() ? snap.data() : {};
      const role = data.role || (user.email === window.ADMIN_EMAIL ? "admin" : "user");
      window._currentUser = {
        ...user,
        role,
        isAdmin: role === "admin",
        username: data.username || user.displayName || '',
        bio: data.bio || '',
        photoURL: data.photoURL || user.photoURL || ''
      };
    } catch {
      window._currentUser = { ...user, role: "user", isAdmin: user.email === window.ADMIN_EMAIL };
    }
  } else {
    window._currentUser = null;
  }
  window.dispatchEvent(new Event("authchange"));
});
