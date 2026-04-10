import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./config";

// ─── Sign Up ──────────────────────────────────────────────────────────────────

export async function signUpAdmin(
  email: string,
  password: string,
  name: string,
  schoolName: string,
  schoolCode: string
) {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const uid = credential.user.uid;

  // Create school document
  const schoolRef = doc(db, "schools", uid); // use adminUid as schoolId for now
  await setDoc(schoolRef, {
    name: schoolName,
    schoolCode,
    adminUid: uid,
    createdAt: serverTimestamp(),
  });

  // Create user document — MUST exist or Firestore rules will block all reads
  await setDoc(doc(db, "users", uid), {
    uid,
    email,
    name,
    role: "admin",
    schoolId: uid,
    linkedId: null,
    status: "active",
    createdAt: serverTimestamp(),
  });

  return credential.user;
}

// ─── Sign In ──────────────────────────────────────────────────────────────────

export async function signIn(email: string, password: string) {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

// ─── Sign Out ─────────────────────────────────────────────────────────────────

export async function logOut() {
  await signOut(auth);
}

// ─── Get user role from Firestore ─────────────────────────────────────────────

export async function getUserData(uid: string) {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  return snap.data();
}

// ─── Auth state listener ──────────────────────────────────────────────────────

export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}
