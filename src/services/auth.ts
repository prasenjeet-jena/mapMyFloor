import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signInAnonymously as firebaseSignInAnonymously, 
  signOut as firebaseSignOut, 
  onAuthStateChanged as firebaseOnAuthStateChanged,
  User
} from 'firebase/auth';
import { auth } from './firebase';

export const signInWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  return signInWithPopup(auth, provider);
};

export const signInAnonymously = async () => {
  return firebaseSignInAnonymously(auth);
};

export const signOut = async () => {
  return firebaseSignOut(auth);
};

export const onAuthStateChanged = (callback: (user: User | null) => void) => {
  return firebaseOnAuthStateChanged(auth, callback);
};
