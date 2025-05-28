import React from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogContentText, 
  DialogActions,
  Button,
  Snackbar,
  Alert
} from '@mui/material';

/**
 * Composant pour gérer les dialogues et notifications dans le formulaire dynamique
 * 
 * @param {Object} props - Propriétés du composant
 * @param {boolean} props.showAuthError - Si l'erreur d'authentification doit être affichée
 * @param {Function} props.setShowAuthError - Fonction pour définir l'affichage de l'erreur d'authentification
 * @param {boolean} props.showSuccess - Si la notification de succès doit être affichée
 * @param {Function} props.setShowSuccess - Fonction pour définir l'affichage du succès
 * @param {string} props.successMessage - Message de succès à afficher
 * @returns {JSX.Element} Composant React
 */
const DialogComponents = ({
  showAuthError = false,
  setShowAuthError,
  showSuccess = false,
  setShowSuccess,
  successMessage = "Opération réussie"
}) => {
  // Gestionnaire de fermeture pour l'erreur d'authentification
  const handleAuthErrorClose = () => {
    if (setShowAuthError) {
      setShowAuthError(false);
    }
  };

  // Gestionnaire de fermeture pour la notification de succès
  const handleSuccessClose = () => {
    if (setShowSuccess) {
      setShowSuccess(false);
    }
  };

  // Gestionnaire de redirection vers la page de connexion
  const handleLoginRedirect = () => {
    // Enregistrer l'URL actuelle pour rediriger après connexion
    const currentPath = window.location.pathname;
    localStorage.setItem('redirectAfterLogin', currentPath);
    
    // Rediriger vers la page de connexion
    window.location.href = '/login';
  };

  return (
    <>
      {/* Dialogue d'erreur d'authentification */}
      <Dialog
        open={showAuthError}
        onClose={handleAuthErrorClose}
        aria-labelledby="auth-error-dialog-title"
        aria-describedby="auth-error-dialog-description"
      >
        <DialogTitle id="auth-error-dialog-title">
          Session expirée
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="auth-error-dialog-description">
            Votre session a expiré ou vous n'êtes pas authentifié. Veuillez vous reconnecter pour continuer.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleAuthErrorClose} color="primary">
            Fermer
          </Button>
          <Button onClick={handleLoginRedirect} color="primary" variant="contained" autoFocus>
            Se connecter
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Notification de succès */}
      <Snackbar 
        open={showSuccess} 
        autoHideDuration={6000} 
        onClose={handleSuccessClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleSuccessClose} 
          severity="success" 
          sx={{ width: '100%' }}
        >
          {successMessage}
        </Alert>
      </Snackbar>
    </>
  );
};

export default DialogComponents;
