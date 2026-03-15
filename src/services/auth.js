// src/services/auth.js
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

export const ROLES = {
  USER:     'user',
  ADMIN_JR: 'admin_jr',
  ADMIN:    'admin',
  OWNER:    'owner',   // ← dueño de la plataforma
}

function getRoleFromEmail(email) {
  if (email === ADMIN_EMAIL) return ROLES.OWNER
  return ROLES.USER
}

export async function registerWithEmail(email, password, username) {
  const cred = await createUserWithEmailAndPassword(auth, email, password)
  await updateProfile(cred.user, { displayName: username })
  const role = getRoleFromEmail(email)
  await setDoc(doc(db, 'users', cred.user.uid), {
    uid: cred.user.uid, email, username, displayName: username,
    role, photoURL: '', bio: '',
    followers: 0, following: 0, posts: 0,
    verified: role === ROLES.OWNER, // owner siempre verificado
    banned: false, createdAt: serverTimestamp(),
  })
  return cred.user
}

export async function loginWithEmail(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password)
  const userDoc = await getDoc(doc(db, 'users', cred.user.uid))
  if (userDoc.exists() && userDoc.data().banned) {
    await signOut(auth)
    throw new Error('Tu cuenta ha sido suspendida.')
  }
  return cred.user
}

export async function loginWithGoogle() {
  const provider = new GoogleAuthProvider()
  const cred = await signInWithPopup(auth, provider)
  const userRef = doc(db, 'users', cred.user.uid)
  const snap = await getDoc(userRef)
  if (!snap.exists()) {
    const role = getRoleFromEmail(cred.user.email)
    await setDoc(userRef, {
      uid: cred.user.uid, email: cred.user.email,
      username: cred.user.displayName || cred.user.email.split('@')[0],
      displayName: cred.user.displayName, role,
      photoURL: cred.user.photoURL || '', bio: '',
      followers: 0, following: 0, posts: 0,
      verified: role === ROLES.OWNER,
      banned: false, createdAt: serverTimestamp(),
    })
  } else if (snap.data().banned) {
    await signOut(auth)
    throw new Error('Tu cuenta ha sido suspendida.')
  }
  return cred.user
}

export async function logout() { await signOut(auth) }

export async function resetPassword(email) {
  await sendPasswordResetEmail(auth, email)
}

export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, 'users', uid))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() }
}

export async function updateUserProfile(uid, updates) {
  // Proteger al owner: nadie puede quitarle verified ni cambiar su rol
  const snap = await getDoc(doc(db, 'users', uid))
  if (snap.exists() && snap.data().role === ROLES.OWNER) {
    delete updates.role
    delete updates.verified  // owner siempre verificado
    delete updates.banned
  }
  await updateDoc(doc(db, 'users', uid), { ...updates, updatedAt: serverTimestamp() })
  if (updates.displayName || updates.photoURL) {
    await updateProfile(auth.currentUser, {
      displayName: updates.displayName,
      photoURL: updates.photoURL,
    })
  }
}

export async function buildUserObject(firebaseUser) {
  if (!firebaseUser) return null
  try {
    const snap = await getDoc(doc(db, 'users', firebaseUser.uid))
    const data = snap.exists() ? snap.data() : {}

    // Rol viene SIEMPRE de Firestore primero, luego fallback por email
    let role = data.role
    if (!role || role === 'user') {
      // Solo usar email fallback si no hay rol en Firestore
      if (firebaseUser.email === ADMIN_EMAIL) role = ROLES.OWNER
      else role = data.role || ROLES.USER
    }

    const isOwner   = role === ROLES.OWNER
    const isAdmin   = role === ROLES.ADMIN   || isOwner
    const isAdminJr = role === ROLES.ADMIN_JR
    const isStaff   = isAdmin || isAdminJr || isOwner

    return {
      uid:         firebaseUser.uid,
      email:       firebaseUser.email,
      displayName: data.displayName || firebaseUser.displayName || '',
      photoURL:    data.photoURL    || firebaseUser.photoURL    || '',
      role,
      isOwner,
      isAdmin,
      isAdminJr,
      isStaff,
      username:  data.username || firebaseUser.displayName || '',
      bio:       data.bio      || '',
      verified:  isOwner ? true : (data.verified === true),
      banned:    data.banned   || false,
      followers: data.followers || 0,
      following: data.following || 0,
      posts:     data.posts     || 0,
    }
  } catch (err) {
    console.error('buildUserObject error:', err)
    return {
      uid:         firebaseUser.uid,
      email:       firebaseUser.email,
      displayName: firebaseUser.displayName || '',
      photoURL:    firebaseUser.photoURL    || '',
      role: ROLES.USER,
      isOwner: false, isAdmin: false, isAdminJr: false, isStaff: false,
      username: firebaseUser.displayName || '',
      bio: '', verified: false, banned: false,
    }
  }
}
