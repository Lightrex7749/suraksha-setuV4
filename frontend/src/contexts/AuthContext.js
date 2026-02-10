import React, { createContext, useState, useContext, useEffect } from 'react';
import { auth, loginWithEmail, loginWithGoogle, registerWithEmail, logout as firebaseLogout } from '../config/firebase';
import { onAuthStateChanged } from 'firebase/auth';

const AuthContext = createContext(null);

// 🔧 DEVELOPMENT MODE - Set to true to bypass Firebase authentication
const DEV_MODE = true; // Change to false when Firebase is configured

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // 🔧 DEVELOPMENT MODE BYPASS
    if (DEV_MODE) {
      console.log('🔧 DEV MODE: Using mock authentication');
      const mockUser = {
        id: 'dev_user_' + Date.now(),
        email: 'dev@suraksha.local',
        name: 'Development User',
        photoURL: null,
        role: 'citizen',
        emailVerified: true
      };
      const mockToken = 'dev_token_' + Date.now();
      
      setUser(mockUser);
      setToken(mockToken);
      localStorage.setItem('auth_token', mockToken);
      localStorage.setItem('auth_user', JSON.stringify(mockUser));
      setLoading(false);
      return;
    }

    // PRODUCTION MODE: Firebase authentication
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // User is signed in
        const idToken = await firebaseUser.getIdToken();
        
        const userData = {
          id: firebaseUser.uid,
          email: firebaseUser.email,
          name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
          photoURL: firebaseUser.photoURL,
          role: 'citizen', // Default role, can be updated from backend
          emailVerified: firebaseUser.emailVerified
        };
        
        setUser(userData);
        setToken(idToken);
        
        // Store in localStorage for persistence
        localStorage.setItem('auth_token', idToken);
        localStorage.setItem('auth_user', JSON.stringify(userData));
      } else {
        // User is signed out
        setUser(null);
        setToken(null);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
      }
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  const login = async (email, password) => {
    // 🔧 DEVELOPMENT MODE BYPASS
    if (DEV_MODE) {
      // Check if user exists in localStorage from previous registration
      const storedUser = localStorage.getItem('auth_user');
      let mockUser;
      
      if (storedUser) {
        try {
          mockUser = JSON.parse(storedUser);
          mockUser.email = email; // Update email to match login
          console.log('🔧 DEV MODE: Mock login for', email, 'with stored role:', mockUser.role);
        } catch (e) {
          mockUser = {
            id: 'dev_user_' + Date.now(),
            email: email,
            name: email.split('@')[0],
            photoURL: null,
            role: 'citizen',
            emailVerified: true
          };
          console.log('🔧 DEV MODE: Mock login for', email, '(new user)');
        }
      } else {
        mockUser = {
          id: 'dev_user_' + Date.now(),
          email: email,
          name: email.split('@')[0],
          photoURL: null,
          role: 'citizen',
          emailVerified: true
        };
        console.log('🔧 DEV MODE: Mock login for', email, '(new user)');
      }
      
      setUser(mockUser);
      const token = 'dev_token_' + Date.now();
      setToken(token);
      localStorage.setItem('auth_user', JSON.stringify(mockUser));
      localStorage.setItem('auth_token', token);
      return mockUser;
    }

    // PRODUCTION MODE: Firebase login
    try {
      setError(null);
      setLoading(true);
      const firebaseUser = await loginWithEmail(email, password);
      const idToken = await firebaseUser.getIdToken();
      
      const userData = {
        id: firebaseUser.uid,
        email: firebaseUser.email,
        name: firebaseUser.displayName || email.split('@')[0],
        photoURL: firebaseUser.photoURL,
        role: 'citizen'
      };
      
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
    // 🔧 DEVELOPMENT MODE BYPASS
    if (DEV_MODE) {
      console.log('🔧 DEV MODE: Mock registration for', email, 'as', role);
      const mockUser = {
        id: 'dev_user_' + Date.now(),
        email: email,
        name: displayName || email.split('@')[0],
        photoURL: null,
        role: role,
        emailVerified: true
      };
      setUser(mockUser);
      setToken('dev_token_' + Date.now());
      localStorage.setItem('auth_user', JSON.stringify(mockUser));
      localStorage.setItem('auth_token', 'dev_token_' + Date.now());
      return mockUser;
    }

    // PRODUCTION MODE: Firebase registration
    try {
      setError(null);
      setLoading(true);
      const firebaseUser = await registerWithEmail(email, password, displayName);
      const idToken = await firebaseUser.getIdToken();
      
      const userData = {
        id: firebaseUser.uid,
        email: firebaseUser.email,
        name: displayName || email.split('@')[0],
        photoURL: firebaseUser.photoURL,
        role: role
      };
      
      setUser(userData);
      setToken(idToken);
      localStorage.setItem('auth_user', JSON.stringify(userData));
      localStorage.setItem('auth_token', idToken);
      return userData;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    // 🔧 DEVELOPMENT MODE BYPASS
    if (DEV_MODE) {
      console.log('🔧 DEV MODE: Mock Google sign-in');
      const mockUser = {
        id: 'dev_user_google_' + Date.now(),
        email: 'dev.google@suraksha.local',
        name: 'Dev Google User',
        photoURL: 'https://ui-avatars.com/api/?name=Dev+User&background=4F46E5&color=fff',
        role: 'citizen',
        emailVerified: true
      };
      setUser(mockUser);
      setToken('dev_token_google_' + Date.now());
      return mockUser;
    }

    // PRODUCTION MODE: Firebase Google sign-in
    try {
      setError(null);
      setLoading(true);
      const firebaseUser = await loginWithGoogle();
      const idToken = await firebaseUser.getIdToken();
      
      const userData = {
        id: firebaseUser.uid,
        email: firebaseUser.email,
        name: firebaseUser.displayName || 'User',
        photoURL: firebaseUser.photoURL,
        role: 'citizen'
      };
      
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
    // 🔧 DEVELOPMENT MODE BYPASS
    if (DEV_MODE) {
      console.log('🔧 DEV MODE: Mock logout');
      setUser(null);
      setToken(null);
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      return;
    }

    // PRODUCTION MODE: Firebase logout
    try {
      setError(null);
      await firebaseLogout();
      setUser(null);
      setToken(null);
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const refreshToken = async () => {
    // 🔧 DEVELOPMENT MODE BYPASS
    if (DEV_MODE) {
      const newToken = 'dev_token_refreshed_' + Date.now();
      setToken(newToken);
      localStorage.setItem('auth_token', newToken);
      return newToken;
    }

    // PRODUCTION MODE: Firebase token refresh
    if (auth.currentUser) {
      const idToken = await auth.currentUser.getIdToken(true);
      setToken(idToken);
      localStorage.setItem('auth_token', idToken);
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
    devMode: DEV_MODE // Expose dev mode status
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
