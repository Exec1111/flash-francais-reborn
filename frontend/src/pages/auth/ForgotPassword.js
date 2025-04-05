import React, { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  TextField,
  Typography,
  useTheme,
  Alert,
  AlertTitle
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LockResetIcon from '@mui/icons-material/LockReset';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const theme = useTheme();

  const handleSubmit = (e) => {
    e.preventDefault();
    // Simulation d'un envoi d'email de réinitialisation
    // Dans une application réelle, vous feriez un appel API ici
    setSubmitted(true);
  };

  return (
    <Box className="auth-container">
      <Card className="auth-card" elevation={4}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 4 }}>
            <Box 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                width: 60, 
                height: 60, 
                borderRadius: '50%', 
                backgroundColor: 'rgba(79, 106, 255, 0.1)',
                mb: 2
              }}
            >
              <LockResetIcon sx={{ color: theme.palette.primary.main, fontSize: 32 }} />
            </Box>
            <Typography 
              variant="h4" 
              component="h1" 
              gutterBottom
              sx={{ 
                fontWeight: 700,
                mb: 1
              }}
            >
              Mot de passe oublié
            </Typography>
            <Typography 
              variant="body1" 
              color="text.secondary" 
              align="center"
              sx={{ mb: 3 }}
            >
              Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
            </Typography>
          </Box>

          {submitted ? (
            <Box sx={{ mb: 4 }}>
              <Alert severity="success" sx={{ mb: 3 }}>
                <AlertTitle>Email envoyé</AlertTitle>
                Si un compte existe avec l'adresse <strong>{email}</strong>, vous recevrez un email avec les instructions pour réinitialiser votre mot de passe.
              </Alert>
              <Button
                component={RouterLink}
                to="/login"
                variant="contained"
                color="primary"
                fullWidth
                size="large"
              >
                Retour à la connexion
              </Button>
            </Box>
          ) : (
            <form onSubmit={handleSubmit} className="auth-form">
              <TextField
                label="Email"
                variant="outlined"
                fullWidth
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                type="email"
                placeholder="votre@email.com"
              />

              <Button
                type="submit"
                variant="contained"
                color="primary"
                fullWidth
                size="large"
                sx={{ mt: 2 }}
              >
                Envoyer les instructions
              </Button>
            </form>
          )}

          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <Button
              component={RouterLink}
              to="/login"
              startIcon={<ArrowBackIcon />}
              sx={{ color: 'text.secondary' }}
            >
              Retour à la connexion
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ForgotPassword;
