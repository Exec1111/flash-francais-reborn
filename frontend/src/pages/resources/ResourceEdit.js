import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  TextField,
  Card,
  CardContent,
  CardHeader,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';

const ResourceEdit = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const resourceId = location.pathname.split('/')[3]; // Récupère l'ID depuis l'URL
  
  const [resource, setResource] = useState({
    title: '',
    description: '',
    type: '',
    content: '',
    session_ids: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchResource = async () => {
    if (!resourceId) return;
    
    setLoading(true);
    try {
      const response = await axios.get(`http://localhost:10000/api/v1/resources/${resourceId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      setResource(response.data);
    } catch (err) {
      setError('Erreur lors du chargement de la ressource');
      console.error('Erreur:', err.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (resourceId) {
      console.log('ResourceEdit: Chargement de la ressource:', resourceId);
      fetchResource();
    }
  }, [resourceId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setResource(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.put(`http://localhost:10000/api/v1/resources/${resourceId}`, resource, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      setSuccess('Ressource mise à jour avec succès');
      setTimeout(() => {
        navigate('/resources');
      }, 2000);
    } catch (err) {
      setError('Erreur lors de la mise à jour de la ressource');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', pt: 4 }}>
        <Typography variant="h6">Chargement de la ressource...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Card>
        <CardHeader title="Modifier la ressource" />
        <CardContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {success}
            </Alert>
          )}
          <form onSubmit={handleSubmit}>
            <Box sx={{ mt: 2 }}>
              <TextField
                fullWidth
                label="Titre"
                name="title"
                value={resource.title}
                onChange={handleChange}
                margin="normal"
                required
              />
              <TextField
                fullWidth
                label="Description"
                name="description"
                value={resource.description}
                onChange={handleChange}
                margin="normal"
                multiline
                rows={4}
              />
              <FormControl fullWidth margin="normal">
                <InputLabel>Type</InputLabel>
                <Select
                  name="type"
                  value={resource.type}
                  onChange={handleChange}
                  label="Type"
                >
                  <MenuItem value="video">Vidéo</MenuItem>
                  <MenuItem value="audio">Audio</MenuItem>
                  <MenuItem value="text">Texte</MenuItem>
                  <MenuItem value="image">Image</MenuItem>
                </Select>
              </FormControl>
              <TextField
                fullWidth
                label="Contenu"
                name="content"
                value={JSON.stringify(resource.content, null, 2)}
                onChange={(e) => setResource(prev => ({
                  ...prev,
                  content: JSON.parse(e.target.value)
                }))}
                margin="normal"
                multiline
                rows={6}
              />
              <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                <Button variant="outlined" onClick={() => navigate('/resources')}>
                  Annuler
                </Button>
                <Button variant="contained" type="submit">
                  Sauvegarder
                </Button>
              </Box>
            </Box>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ResourceEdit;
