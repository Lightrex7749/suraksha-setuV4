import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext(null);

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

  useEffect(() => {
    // Load user and token from localStorage on mount
    let storedToken = localStorage.getItem('auth_token');
    let storedUser = localStorage.getItem('auth_user');
    
    // Auto-authenticate if no user is logged in
    if (!storedToken || !storedUser) {
      const demoUser = {
        id: 'demo_user',
        name: 'Demo User',
        email: 'demo@suraksha.local',
        role: 'citizen'
      };
      const demoToken = 'demo_token_' + Date.now();
      
      localStorage.setItem('auth_token', demoToken);
      localStorage.setItem('auth_user', JSON.stringify(demoUser));
      
      setToken(demoToken);
      setUser(demoUser);
    } else {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    
    setLoading(false);
  }, []);

  const login = (token, user) => {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify(user));
    setToken(token);
    setUser(user);
  };

  const logout = () => {
    // Don't actually logout - just reset to demo user for this demo
    const demoUser = {
      id: 'demo_user',
      name: 'Demo User',
      email: 'demo@suraksha.local',
      role: 'citizen'
    };
    const demoToken = 'demo_token_' + Date.now();
    
    localStorage.setItem('auth_token', demoToken);
    localStorage.setItem('auth_user', JSON.stringify(demoUser));
    setToken(demoToken);
    setUser(demoUser);
  };

  const value = {
    user,
    token,
    login,
    logout,
    loading,
    isAuthenticated: true  // Always authenticated
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
