import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import authService from '../services/auth';
import SessionWarningModal from '../components/auth/SessionWarningModal';
import useSessionManager from '../hooks/useSessionManager';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);

  // Définir logout avant useSessionManager avec useCallback pour éviter les re-créations
  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
    setToken(null);
    setIsAuthenticated(false);
  }, []);

  // Gestionnaire de session
  const {
    showWarning,
    timeRemaining,
    isExtending,
    extendSession,
    handleLogout: sessionLogout
  } = useSessionManager(token, logout);

  useEffect(() => {
    // Vérifier l'authentification au démarrage
    if (token) {
      const userInfo = authService.getUser();
      if (userInfo) {
        setUser(userInfo);
        setIsAuthenticated(true);
      }
    }
  }, [token]);

  const login = useCallback(async (email, password) => {
    try {
      const userData = await authService.login(email, password);
      setUser(userData);
      setIsAuthenticated(true);
      // Récupérer le token stocké par authService dans le localStorage
      const storedToken = localStorage.getItem('token');
      setToken(storedToken);
      return userData;
    } catch (error) {
      throw error;
    }
  }, []);

  const handleExtendSession = useCallback(async () => {
    await extendSession();
    // Mettre à jour le token dans le state après prolongation
    const newToken = localStorage.getItem('token');
    setToken(newToken);
  }, [extendSession]);

  const value = useMemo(() => ({
    isAuthenticated,
    user,
    token,
    login,
    logout,
  }), [isAuthenticated, user, token, login, logout]);

  return (
    <AuthContext.Provider value={value}>
      {children}
      {/* Modal de warning de session */}
      <SessionWarningModal
        open={showWarning && isAuthenticated}
        timeRemaining={timeRemaining}
        onExtendSession={handleExtendSession}
        onLogout={sessionLogout}
        isExtending={isExtending}
      />
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
