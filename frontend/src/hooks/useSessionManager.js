import { useState, useEffect, useCallback, useRef } from 'react';
import authService from '../services/auth';

const useSessionManager = (token, logout) => {
  const [showWarning, setShowWarning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [isExtending, setIsExtending] = useState(false);
  const intervalRef = useRef(null);
  const warningShownRef = useRef(false);
  const logoutRef = useRef(logout);
  const configRef = useRef({
    warningThresholdMinutes: 5,
    extendDurationMinutes: 30,
    checkIntervalSeconds: 30
  });

  // Mettre à jour la référence de logout
  useEffect(() => {
    logoutRef.current = logout;
  }, [logout]);

  const checkSessionStatus = useCallback(async () => {
    if (!token) return;

    try {
      const status = await authService.getSessionStatus();
      console.log('[SESSION DEBUG FRONTEND] Status from backend:', status);
      setTimeRemaining(status.time_remaining_minutes);
      
      // Mettre à jour la configuration depuis le backend (sans déclencher de re-render)
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
  }, [token]);

  const extendSession = useCallback(async () => {
    if (!token) return;

    setIsExtending(true);
    try {
      const response = await authService.extendSession();
      
      // Mettre à jour le token dans le localStorage et le contexte
      localStorage.setItem('token', response.access_token);
      
      // Fermer le modal de warning
      setShowWarning(false);
      warningShownRef.current = false;
      
      // Vérifier immédiatement le nouveau statut
      await checkSessionStatus();
      
    } catch (error) {
      console.error('Erreur lors de la prolongation de session:', error);
      throw error;
    } finally {
      setIsExtending(false);
    }
  }, [token, checkSessionStatus]);

  const handleLogout = useCallback(() => {
    setShowWarning(false);
    warningShownRef.current = false;
    logoutRef.current();
  }, []);

  // Démarrer/arrêter la surveillance de session
  useEffect(() => {
    if (token) {
      // Vérification immédiate
      checkSessionStatus();
      
      // Démarrer l'intervalle de vérification
      intervalRef.current = setInterval(
        checkSessionStatus, 
        configRef.current.checkIntervalSeconds * 1000
      );
    } else {
      // Nettoyer l'intervalle si pas de token
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setShowWarning(false);
      warningShownRef.current = false;
      setTimeRemaining(null);
    }

    // Cleanup à la destruction du composant
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [token, checkSessionStatus]);

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
