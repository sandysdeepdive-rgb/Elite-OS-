import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from './firebase/config';

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export async function signInWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}
