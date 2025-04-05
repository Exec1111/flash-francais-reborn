import React, { useState, useEffect } from 'react';
import { useNavigate, Link as RouterLink, useLocation } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  TextField,
  Typography,
  IconButton,
  InputAdornment,
  Alert,
  CircularProgress
} from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import FacebookIcon from '@mui/icons-material/Facebook';
import AppleIcon from '@mui/icons-material/Apple';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import authService from '../../services/auth';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [shouldRedirect, setShouldRedirect] = useState(false);

  // Pré-remplissage des champs en mode développement
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      setEmail('student2@example.com');
      setPassword('aa');
    }
  }, []);

  useEffect(() => {
    if (shouldRedirect) {
      navigate('/dashboard', { replace: true });
    }
  }, [shouldRedirect, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    console.log('Login: Début de la connexion');
    
    try {
      setLoading(true);
      console.log('Login: Appel du service d\'authentification');
      
      // Appel au service d'authentification pour la connexion
      const userData = await authService.login(email, password);
      console.log('Login: Connexion réussie, données utilisateur:', userData);
      
      // Déclencher la redirection après la mise à jour de l'état
      console.log('Login: Redirection vers le dashboard');
      setShouldRedirect(true);
    } catch (err) {
      console.error('Login: Erreur lors de la connexion:', err);
      setError(err.detail || 'Email ou mot de passe incorrect');
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <Box className="auth-container">
      <Card className="auth-card" elevation={4}>
        <CardContent sx={{ p: 3 }}>
          <Typography 
            variant="h4" 
            component="h1" 
            align="center" 
            gutterBottom
            sx={{ 
              fontWeight: 700,
              mb: 3
            }}
          >
            Connexion
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <div className="social-buttons">
            <Button
              variant="outlined"
              fullWidth
              startIcon={<GoogleIcon />}
              className="social-button"
              disabled={loading}
            >
              Google
            </Button>
            <Button
              variant="outlined"
              fullWidth
              startIcon={<FacebookIcon />}
              className="social-button"
              disabled={loading}
            >
              Facebook
            </Button>
            <Button
              variant="outlined"
              fullWidth
              startIcon={<AppleIcon />}
              className="social-button"
              disabled={loading}
            >
              Apple
            </Button>
          </div>

          <div className="auth-divider">
            <span>ou</span>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <TextField
              label="Email"
              variant="outlined"
              fullWidth
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              type="email"
              disabled={loading}
            />
            <TextField
              label="Mot de passe"
              variant="outlined"
              fullWidth
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              type={showPassword ? "text" : "password"}
              disabled={loading}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={togglePasswordVisibility}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', width: '100%', mb: 2 }}>
              <Button
                component={RouterLink}
                to="/forgot-password"
                color="primary"
                sx={{ p: 0, minWidth: 'auto' }}
                disabled={loading}
              >
                Mot de passe oublié ?
              </Button>
            </Box>

            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              size="large"
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : "Se connecter"}
            </Button>
          </form>

          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Vous n'avez pas de compte ?{' '}
              <Button
                component={RouterLink}
                to="/register"
                color="primary"
                sx={{ p: 0, minWidth: 'auto' }}
                disabled={loading}
              >
                Inscrivez-vous
              </Button>
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Login;
