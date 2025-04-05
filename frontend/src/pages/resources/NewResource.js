import React, { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const NewResource = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'text',
    content: '',
  });
  const [error, setError] = useState('');

  // Récupérer l'ID de l'utilisateur depuis les paramètres de l'URL
  const userId = new URLSearchParams(location.search).get('userId');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch('http://localhost:10000/api/v1/resources', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...formData,
          user_id: userId
        })
      });

      if (!response.ok) {
        throw new Error('Erreur lors de l\'ajout de la ressource');
      }

      const data = await response.json();
      // Redirection vers la page précédente
      navigate(-1);
    } catch (err) {
      setError(err.message || 'Une erreur est survenue');
      console.error('Erreur lors de l\'ajout de la ressource:', err);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Ajouter une nouvelle ressource
        </Typography>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
      </Box>

      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Titre"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              required
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              multiline
              rows={3}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Type de ressource</InputLabel>
              <Select
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                label="Type de ressource"
              >
                <MenuItem value="text">Texte</MenuItem>
                <MenuItem value="video">Vidéo</MenuItem>
                <MenuItem value="exercise">Exercice</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Contenu"
              name="content"
              value={formData.content}
              onChange={handleInputChange}
              multiline
              rows={4}
            />
          </Grid>
        </Grid>

        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          <Button variant="outlined" onClick={() => navigate(-1)}>
            Annuler
          </Button>
          <Button type="submit" variant="contained" color="primary">
            Sauvegarder
          </Button>
        </Box>
      </form>
    </Box>
  );
};

export default NewResource;
