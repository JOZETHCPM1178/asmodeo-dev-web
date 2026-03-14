// src/services/auth.js
// ════════════════════════════════════════
//  AUTH SERVICE — Autenticación y gestión de usuarios
// ════════════════════════════════════════
import {
  auth, db,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  doc, setDoc, getDoc, updateDoc, serverTimestamp,
} from './firebase'

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL

// ─── ROLES ───
export const ROLES = {
  USER: 'user',
  ADMIN_JR: 'admin_jr',
  ADMIN: 'admin',
}

// ─── REGISTRAR CON EMAIL ───
export async function registerWithEmail(email, password, username) {
  const cred = await createUserWithEmailAndPassword(auth, email, password)
  await updateProfile(cred.user, { displayName: username })

  const role = email === ADMIN_EMAIL ? ROLES.ADMIN : ROLES.USER
  await setDoc(doc(db, 'users', cred.user.uid), {
    uid: cred.user.uid,
    email,
    username,
    displayName: username,
    role,
    photoURL: '',
    bio: '',
    followers: 0,
    following: 0,
    posts: 0,
    verified: false,
    banned: false,
    createdAt: serverTimestamp(),
  })

  return cred.user
}

// ─── LOGIN CON EMAIL ───
export async function loginWithEmail(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password)
  const userDoc = await getDoc(doc(db, 'users', cred.user.uid))
  if (userDoc.exists() && userDoc.data().banned) {
    await signOut(auth)
    throw new Error('Tu cuenta ha sido suspendida.')
  }
  return cred.user
}

// ─── LOGIN CON GOOGLE ───
export async function loginWithGoogle() {
  const provider = new GoogleAuthProvider()
  const cred = await signInWithPopup(auth, provider)
  const userRef = doc(db, 'users', cred.user.uid)
  const snap = await getDoc(userRef)

  if (!snap.exists()) {
    const role = cred.user.email === ADMIN_EMAIL ? ROLES.ADMIN : ROLES.USER
    await setDoc(userRef, {
      uid: cred.user.uid,
      email: cred.user.email,
      username: cred.user.displayName || cred.user.email.split('@')[0],
      displayName: cred.user.displayName,
      role,
      photoURL: cred.user.photoURL || '',
      bio: '',
      followers: 0,
      following: 0,
      posts: 0,
      verified: false,
      banned: false,
      createdAt: serverTimestamp(),
    })
  } else if (snap.data().banned) {
    await signOut(auth)
    throw new Error('Tu cuenta ha sido suspendida.')
  }

  return cred.user
}

// ─── LOGOUT ───
export async function logout() {
  await signOut(auth)
}

// ─── RESET PASSWORD ───
export async function resetPassword(email) {
  await sendPasswordResetEmail(auth, email)
}

// ─── OBTENER PERFIL DE USUARIO ───
// Si no existe el documento en Firestore, lo crea automáticamente
export async function getUserProfile(uid) {
  const ref = doc(db, 'users', uid)
  const snap = await getDoc(ref)

  if (snap.exists()) {
    return { id: snap.id, ...snap.data() }
  }

  // Documento no existe — intentar crearlo desde Firebase Auth
  // (usuarios registrados antes del nuevo sistema)
  const currentUser = auth.currentUser
  if (currentUser && currentUser.uid === uid) {
    const role = currentUser.email === import.meta.env.VITE_ADMIN_EMAIL
      ? ROLES.ADMIN
      : ROLES.USER
    const profileData = {
      uid,
      email: currentUser.email || '',
      username: currentUser.displayName || currentUser.email?.split('@')[0] || 'Usuario',
      displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Usuario',
      role,
      photoURL: currentUser.photoURL || '',
      bio: '',
      followers: 0,
      following: 0,
      posts: 0,
      verified: false,
      banned: false,
      createdAt: serverTimestamp(),
    }
    await setDoc(ref, profileData)
    return { id: uid, ...profileData }
  }

  return null
}

// ─── ACTUALIZAR PERFIL ───
export async function updateUserProfile(uid, updates) {
  const ref = doc(db, 'users', uid)
  const snap = await getDoc(ref)

  if (snap.exists()) {
    await updateDoc(ref, { ...updates, updatedAt: serverTimestamp() })
  } else {
    // Crear el documento si no existe
    await setDoc(ref, {
      uid,
      email: auth.currentUser?.email || '',
      username: updates.displayName || '',
      displayName: updates.displayName || '',
      role: ROLES.USER,
      photoURL: updates.photoURL || '',
      bio: updates.bio || '',
      followers: 0,
      following: 0,
      posts: 0,
      verified: false,
      banned: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  }

  if (updates.displayName || updates.photoURL) {
    await updateProfile(auth.currentUser, {
      displayName: updates.displayName,
      photoURL: updates.photoURL,
    }).catch(() => {})
  }
}

// ─── CONSTRUIR OBJETO USER COMPLETO ───
export async function buildUserObject(firebaseUser) {
  if (!firebaseUser) return null
  try {
    const snap = await getDoc(doc(db, 'users', firebaseUser.uid))
    const data = snap.exists() ? snap.data() : {}
    const role = data.role || (firebaseUser.email === ADMIN_EMAIL ? ROLES.ADMIN : ROLES.USER)
    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: data.displayName || firebaseUser.displayName || '',
      photoURL: data.photoURL || firebaseUser.photoURL || '',
      role,
      isAdmin: role === ROLES.ADMIN,
      isAdminJr: role === ROLES.ADMIN_JR,
      isStaff: role === ROLES.ADMIN || role === ROLES.ADMIN_JR,
      username: data.username || firebaseUser.displayName || '',
      bio: data.bio || '',
      verified: data.verified || false,
      banned: data.banned || false,
      followers: data.followers || 0,
      following: data.following || 0,
      posts: data.posts || 0,
    }
  } catch {
    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName || '',
      photoURL: firebaseUser.photoURL || '',
      role: ROLES.USER,
      isAdmin: false,
      isAdminJr: false,
      isStaff: false,
      username: firebaseUser.displayName || '',
      bio: '',
      verified: false,
      banned: false,
    }
  }
}
