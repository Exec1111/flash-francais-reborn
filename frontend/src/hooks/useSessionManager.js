import { useState, useEffect, useCallback, useRef } from 'react';
import authService from '../services/auth';

const useSessionManager = (token, logout) => {
  const [showWarning, setShowWarning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [isExtending, setIsExtending] = useState(false);
  const intervalRef = useRef(null);
  const warningShownRef = useRef(false);
  const tokenRef = useRef(token);
  const logoutRef = useRef(logout);
  const configRef = useRef({
    warningThresholdMinutes: 5,
    extendDurationMinutes: 30,
    checkIntervalSeconds: 30
  });

  // Mettre à jour les références sans déclencher de re-renders
  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  useEffect(() => {
    logoutRef.current = logout;
  }, [logout]);

  // Fonction de vérification stable (pas de dépendances)
  const checkSessionStatus = useCallback(async () => {
    const currentToken = tokenRef.current;
    if (!currentToken) return;

    try {
      const status = await authService.getSessionStatus();
      console.log('[SESSION DEBUG FRONTEND] Status from backend:', status);
      setTimeRemaining(status.time_remaining_minutes);
      
      // Mettre à jour la configuration depuis le backend
      configRef.current = {
        ...configRef.current,
        warningThresholdMinutes: status.warning_threshold_minutes,
        extendDurationMinutes: status.extend_duration_minutes
      };

      // Afficher le warning si nécessaire
      if (status.show_warning && !warningShownRef.current) {
        console.log('[SESSION DEBUG FRONTEND] Showing warning - Time remaining:', status.time_remaining_minutes, 'Threshold:', status.warning_threshold_minutes);
        setShowWarning(true);
        warningShownRef.current = true;
      } else {
        console.log('[SESSION DEBUG FRONTEND] Not showing warning - show_warning:', status.show_warning, 'warningShownRef:', warningShownRef.current);
      }

      // Déconnexion automatique si le temps est écoulé
      if (status.time_remaining_minutes <= 0) {
        logoutRef.current();
        return;
      }

    } catch (error) {
      console.error('Erreur lors de la vérification du statut de session:', error);
      // Si le token est invalide, déconnecter l'utilisateur
      if (error.response?.status === 401) {
        logoutRef.current();
      }
    }
  }, []);

  // Fonction d'extension stable
  const extendSession = useCallback(async () => {
    const currentToken = tokenRef.current;
    if (!currentToken) return;

    setIsExtending(true);
    try {
      const response = await authService.extendSession();
      
      // Mettre à jour le token dans le localStorage
      localStorage.setItem('token', response.access_token);
      
      // Fermer le modal de warning
      setShowWarning(false);
      warningShownRef.current = false;
      
      // Vérifier immédiatement le nouveau statut
      setTimeout(checkSessionStatus, 100);
      
    } catch (error) {
      console.error('Erreur lors de la prolongation de session:', error);
      throw error;
    } finally {
      setIsExtending(false);
    }
  }, [checkSessionStatus]);

  const handleLogout = useCallback(() => {
    setShowWarning(false);
    warningShownRef.current = false;
    logoutRef.current();
  }, []);

  // Gestion de l'intervalle - se déclenche quand le token change
  useEffect(() => {
    // Nettoyer l'intervalle existant
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (token) {
      // Vérification immédiate
      checkSessionStatus();
      
      // Démarrer l'intervalle
      intervalRef.current = setInterval(() => {
        if (tokenRef.current) {
          checkSessionStatus();
        }
      }, configRef.current.checkIntervalSeconds * 1000);
    } else {
      // Pas de token - nettoyer l'état
      setShowWarning(false);
      warningShownRef.current = false;
      setTimeRemaining(null);
    }

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]); // Se déclenche quand le token change

  return {
    showWarning,
    timeRemaining,
    isExtending,
    config: configRef.current,
    extendSession,
    handleLogout
  };
};

export default useSessionManager;
