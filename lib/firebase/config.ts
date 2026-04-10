import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAcMsLE9cBTdbXUhECkgQJz0FCm_JvOO3A",
  authDomain: "elite-is.firebaseapp.com",
  projectId: "elite-is",
  storageBucket: "elite-is.firebasestorage.app",
  messagingSenderId: "643643383896",
  appId: "1:643643383896:web:68508bc482367ae183aa2d",
  measurementId: "G-9QC1G4RPVL"
};

// Prevent duplicate initialization in Next.js
const app = getApps().length === 0
  ? initializeApp(firebaseConfig)
  : getApps()[0];

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
