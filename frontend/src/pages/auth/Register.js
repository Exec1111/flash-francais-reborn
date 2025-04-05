import React, { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  TextField,
  Typography,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  FormLabel,
  Divider,
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

const Register = () => {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('teacher');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Validation de base
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }
    
    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }

    setLoading(true);
    try {
      const userData = {
        email,
        password,
        first_name: firstName, 
        last_name: lastName,
        role,
      };
      
      await authService.register(userData);
      
      navigate('/login', { state: { message: 'Inscription réussie ! Veuillez vous connecter.' } });

    } catch (err) {
      console.error("Registration error:", err); 
      const errorMessage = err.detail || 'Une erreur est survenue lors de l\'inscription.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
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
            Créer un compte
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
              label="Prénom"
              variant="outlined"
              fullWidth
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              disabled={loading}
            />
            <TextField
              label="Nom"
              variant="outlined"
              fullWidth
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              disabled={loading}
            />
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
            <TextField
              label="Confirmer le mot de passe"
              variant="outlined"
              fullWidth
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              type={showConfirmPassword ? "text" : "password"}
              disabled={loading}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={toggleConfirmPasswordVisibility}
                      edge="end"
                    >
                      {showConfirmPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />

            <FormControl component="fieldset">
              <FormLabel component="legend">Je suis</FormLabel>
              <RadioGroup 
                row 
                value={role} 
                onChange={(e) => setRole(e.target.value)}
              >
                <FormControlLabel 
                  value="teacher" 
                  control={<Radio />} 
                  label="Professeur" 
                  disabled={loading}
                />
                <FormControlLabel 
                  value="student" 
                  control={<Radio />} 
                  label="Élève" 
                  disabled={loading}
                />
              </RadioGroup>
            </FormControl>

            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              size="large"
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : "S'inscrire"}
            </Button>
          </form>

          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Vous avez déjà un compte ?{' '}
              <Button
                component={RouterLink}
                to="/login"
                color="primary"
                sx={{ p: 0, minWidth: 'auto' }}
                disabled={loading}
              >
                Connectez-vous
              </Button>
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Register;
