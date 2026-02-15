import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAXy6yy5msccxqsw8jQP7t3FuFinNAwvPg",
  authDomain: "suraksha-setu-1534a.firebaseapp.com",
  projectId: "suraksha-setu-1534a",
  storageBucket: "suraksha-setu-1534a.firebasestorage.app",
  messagingSenderId: "743420774140",
  appId: "1:743420774140:web:644b244bf9307fdaf2b979"
};

// Initialize Firebase
let app;
let analytics;
let initError = null;

try {
  app = initializeApp(firebaseConfig);
  analytics = getAnalytics(app);
  console.log('✅ Firebase initialized successfully');
} catch (error) {
  initError = error;
  console.error('❌ Firebase initialization failed:', error.message);
  console.error('Full error:', error);
}

if (!app) {
  throw new Error(
    'Firebase initialization failed. Please check your Firebase configuration. ' +
    'Ensure the project exists and credentials are correct in firebase.js'
  );
}

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export { analytics };
export const isFirebaseConfigured = !!app && !initError;

// Authentication functions
export const registerWithEmail = async (email, password, displayName) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Update display name
    if (displayName && userCredential.user) {
      await updateProfile(userCredential.user, {
        displayName: displayName
      });
    }
    
    return userCredential.user;
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
};

export const loginWithEmail = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error('Google login error:', error);
    throw error;
  }
};

export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Logout error:', error);
    throw error;
  }
};

export const resetPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    console.error('Password reset error:', error);
    throw error;
  }
};

export default app;
