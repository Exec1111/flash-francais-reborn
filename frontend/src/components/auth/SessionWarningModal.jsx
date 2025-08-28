import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  CircularProgress,
  Alert
} from '@mui/material';
import { Warning as WarningIcon, AccessTime as TimeIcon } from '@mui/icons-material';

const SessionWarningModal = ({ 
  open, 
  timeRemaining, 
  onExtendSession, 
  onLogout, 
  isExtending = false 
}) => {
  const [error, setError] = useState(null);

  const handleExtendSession = async () => {
    try {
      setError(null);
      await onExtendSession();
    } catch (err) {
      setError('Erreur lors de la prolongation de session');
    }
  };

  const formatTime = (minutes) => {
    if (minutes <= 0) return '0 minute';
    if (minutes === 1) return '1 minute';
    return `${minutes} minutes`;
  };

  return (
    <Dialog
      open={open}
      disableEscapeKeyDown
      disableBackdropClick
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <WarningIcon color="warning" />
        Session expirée bientôt
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ textAlign: 'center', py: 2 }}>
          <TimeIcon sx={{ fontSize: 48, color: 'warning.main', mb: 2 }} />
          
          <Typography variant="h6" gutterBottom>
            Votre session va expirer dans
          </Typography>
          
          <Typography 
            variant="h4" 
            color="warning.main" 
            sx={{ fontWeight: 'bold', mb: 2 }}
          >
            {formatTime(timeRemaining)}
          </Typography>
          
          <Typography variant="body1" color="text.secondary">
            Vous pouvez prolonger votre session ou vous déconnecter maintenant.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ justifyContent: 'center', gap: 2, pb: 3 }}>
        <Button
          variant="outlined"
          color="inherit"
          onClick={onLogout}
          disabled={isExtending}
          size="large"
        >
          Se déconnecter
        </Button>
        
        <Button
          variant="contained"
          color="primary"
          onClick={handleExtendSession}
          disabled={isExtending}
          size="large"
          startIcon={isExtending ? <CircularProgress size={20} /> : null}
        >
          {isExtending ? 'Prolongation...' : 'Prolonger la session'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SessionWarningModal;
