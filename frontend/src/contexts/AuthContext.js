import React, { createContext, useState, useContext, useEffect } from 'react';
import { auth, loginWithEmail, loginWithGoogle, registerWithEmail, logout as firebaseLogout, isFirebaseConfigured } from '../config/firebase';
import { onAuthStateChanged } from 'firebase/auth';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Admin email - only this email gets admin role
const ADMIN_EMAIL = 's.sam.11221177@gmail.com';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [firebaseReady, setFirebaseReady] = useState(false);

  // Check Firebase configuration on mount
  useEffect(() => {
    if (!isFirebaseConfigured) {
      console.error('❌ Firebase is not properly configured');
      setError('Firebase configuration error. Please check console for details.');
      setFirebaseReady(false);
      setLoading(false);
    } else {
      setFirebaseReady(true);
    }
  }, []);

  useEffect(() => {
    // Check for persisted session first
    const storedUser = localStorage.getItem('auth_user');
    const storedToken = localStorage.getItem('auth_token');
    const tokenExpiry = localStorage.getItem('auth_token_expiry');

    // Validate token expiry
    if (storedUser && storedToken && tokenExpiry) {
      const expiryTime = parseInt(tokenExpiry, 10);
      if (Date.now() < expiryTime) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          setToken(storedToken);
          setLoading(false);
          console.log('Session restored for:', parsedUser.email);
          return;
        } catch (e) {
          console.error('Failed to restore session:', e);
          // Clear invalid session data
          localStorage.removeItem('auth_user');
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_token_expiry');
        }
      } else {
        console.log('Session expired, clearing stored data');
        localStorage.removeItem('auth_user');
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_token_expiry');
      }
    }

    // Firebase authentication state listener
    if (!auth || !firebaseReady) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // User is signed in
        const idToken = await firebaseUser.getIdToken();

        // Determine role: admin if specific email, otherwise citizen
        const userRole = firebaseUser.email === ADMIN_EMAIL ? 'admin' : 'citizen';

        const userData = {
          id: firebaseUser.uid,
          email: firebaseUser.email,
          name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
          photoURL: firebaseUser.photoURL,
          role: userRole,
          emailVerified: firebaseUser.emailVerified
        };

        setUser(userData);
        setToken(idToken);

        // Store in localStorage with 1-hour expiry
        const expiryTime = Date.now() + (60 * 60 * 1000); // 1 hour
        localStorage.setItem('auth_token', idToken);
        localStorage.setItem('auth_user', JSON.stringify(userData));
        localStorage.setItem('auth_token_expiry', expiryTime.toString());
      } else {
        // User is signed out
        setUser(null);
        setToken(null);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        localStorage.removeItem('auth_token_expiry');
      }
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [firebaseReady]);

  const login = async (email, password) => {
    if (!firebaseReady || !auth) {
      throw new Error('Firebase authentication is not configured. Please check your Firebase setup.');
    }
    try {
      setError(null);
      setLoading(true);
      const firebaseUser = await loginWithEmail(email, password);
      const idToken = await firebaseUser.getIdToken();

      // Determine role: admin if specific email, otherwise citizen
      const userRole = firebaseUser.email === ADMIN_EMAIL ? 'admin' : 'citizen';

      const userData = {
        id: firebaseUser.uid,
        email: firebaseUser.email,
        name: firebaseUser.displayName || firebaseUser.email.split('@')[0],
        photoURL: firebaseUser.photoURL,
        role: userRole,
        emailVerified: firebaseUser.emailVerified
      };

      // Store with expiry
      const expiryTime = Date.now() + (60 * 60 * 1000); // 1 hour
      localStorage.setItem('auth_token', idToken);
      localStorage.setItem('auth_user', JSON.stringify(userData));
      localStorage.setItem('auth_token_expiry', expiryTime.toString());

      setUser(userData);
      setToken(idToken);
      return userData;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (email, password, displayName, role = 'citizen') => {
    if (!firebaseReady || !auth) {
      throw new Error('Firebase authentication is not configured. Please check your Firebase setup.');
    }
    try {
      setError(null);
      setLoading(true);
      const firebaseUser = await registerWithEmail(email, password, displayName);
      const idToken = await firebaseUser.getIdToken();

      // Determine role: admin if specific email, otherwise use selected role
      const userRole = firebaseUser.email === ADMIN_EMAIL ? 'admin' : role;

      const userData = {
        id: firebaseUser.uid,
        email: firebaseUser.email,
        name: displayName || email.split('@')[0],
        photoURL: firebaseUser.photoURL,
        role: userRole,
        emailVerified: firebaseUser.emailVerified
      };

      // Store with expiry
      const expiryTime = Date.now() + (60 * 60 * 1000); // 1 hour
      localStorage.setItem('auth_token', idToken);
      localStorage.setItem('auth_user', JSON.stringify(userData));
      localStorage.setItem('auth_token_expiry', expiryTime.toString());

      setUser(userData);
      setToken(idToken);
      return userData;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    if (!firebaseReady || !auth) {
      throw new Error('Firebase authentication is not configured. Please check your Firebase setup.');
    }
    try {
      setError(null);
      setLoading(true);
      const firebaseUser = await loginWithGoogle();
      const idToken = await firebaseUser.getIdToken();

      // Determine role: admin if specific email, otherwise citizen
      const userRole = firebaseUser.email === ADMIN_EMAIL ? 'admin' : 'citizen';

      const userData = {
        id: firebaseUser.uid,
        email: firebaseUser.email,
        name: firebaseUser.displayName || 'User',
        photoURL: firebaseUser.photoURL,
        role: userRole,
        emailVerified: true
      };

      // Store with expiry
      const expiryTime = Date.now() + (60 * 60 * 1000); // 1 hour
      localStorage.setItem('auth_token', idToken);
      localStorage.setItem('auth_user', JSON.stringify(userData));
      localStorage.setItem('auth_token_expiry', expiryTime.toString());

      setUser(userData);
      setToken(idToken);
      return userData;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    if (!firebaseReady || !auth) {
      // Still allow logout even if Firebase is down
      setUser(null);
      setToken(null);
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      localStorage.removeItem('auth_token_expiry');
      return;
    }
    try {
      setError(null);
      await firebaseLogout();
      setUser(null);
      setToken(null);
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      localStorage.removeItem('auth_token_expiry');
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const refreshToken = async () => {
    if (!firebaseReady || !auth) {
      console.warn('Cannot refresh token: Firebase not configured');
      return null;
    }
    if (auth.currentUser) {
      const idToken = await auth.currentUser.getIdToken(true);
      const expiryTime = Date.now() + (60 * 60 * 1000); // 1 hour
      setToken(idToken);
      localStorage.setItem('auth_token', idToken);
      localStorage.setItem('auth_token_expiry', expiryTime.toString());
      return idToken;
    }
    return null;
  };



  const value = {
    user,
    token,
    login,
    register,
    signInWithGoogle,
    logout,
    refreshToken,
    loading,
    error,
    isAuthenticated: !!user,
    firebaseReady
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
