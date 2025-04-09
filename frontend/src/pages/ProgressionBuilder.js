import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  TextField,
  Typography,
  Card,
  CardContent,
  CardHeader,
  CircularProgress,
  Alert
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import progressionService from '../services/progressionService';
import { useTreeData } from '../contexts/TreeDataContext'; // Importer le hook

const ProgressionBuilder = () => {
  const { progressionId } = useParams(); // Récupère l'ID de la progression depuis l'URL
  const navigate = useNavigate();
  const { token } = useAuth();
  const isEdit = Boolean(progressionId); // Détermine si on est en mode édition

  const [formData, setFormData] = useState({
    title: '',
    description: ''
  });
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Obtenir la fonction de rafraîchissement du contexte
  const { refreshTreeData } = useTreeData();

  // --- Chargement des données initiales en mode édition ---
  useEffect(() => {
    if (isEdit && token) {
      setLoading(true);
      progressionService.getProgressionById(progressionId, token)
        .then(data => {
          setFormData({
            title: data.title || '',
            description: data.description || ''
          });
          setLoading(false);
        })
        .catch(err => {
          console.error("Erreur lors du chargement de la progression:", err);
          setError(err.response?.data?.detail || 'Erreur lors du chargement des données.');
          setLoading(false);
        });
    }
  }, [progressionId, isEdit, token]);

  // --- Gestion des changements dans les champs ---
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // --- Soumission du formulaire ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      let response;
      if (isEdit) {
        response = await progressionService.updateProgression(progressionId, formData, token);
        setSuccess('Progression mise à jour avec succès !');
      } else {
        response = await progressionService.createProgression(formData, token);
        setSuccess('Progression créée avec succès !');
        // Rediriger vers la page d'édition de la nouvelle progression pour ajouter des séquences ?
        // Ou simplement revenir à la page précédente/dashboard ?
        // navigate(`/progressions/edit/${response.id}`); 
      }
      console.log('Réponse du serveur:', response);
      await refreshTreeData(); // Rafraîchir l'arbre après création ou mise à jour
      // Optionnel: Attendre un peu avant de naviguer
      setTimeout(() => navigate(-1), 1500); // Retour page précédente

    } catch (err) {
      console.error("Erreur lors de la soumission:", err);
      setError(err.response?.data?.detail || `Erreur lors de ${isEdit ? 'la mise à jour' : 'la création'}.`);
    } finally {
      setSubmitting(false);
    }
  };

  // --- Rendu ---
  if (loading && isEdit) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      <Card>
        <CardHeader title={isEdit ? 'Modifier la progression' : 'Créer une nouvelle progression'} />
        <CardContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
          
          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              required
              label="Titre de la progression"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              margin="normal"
              disabled={submitting}
            />
            <TextField
              fullWidth
              label="Description (optionnel)"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              margin="normal"
              multiline
              rows={4}
              disabled={submitting}
            />
            
            {/* Ici on pourrait ajouter la sélection/gestion des objectifs plus tard */}

            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
              <Button 
                onClick={() => navigate(-1)} // Retour page précédente
                color="secondary"
                disabled={submitting}
              >
                Annuler
              </Button>
              <Button 
                type="submit" 
                variant="contained" 
                color="primary" 
                disabled={submitting}
                startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : null}
              >
                {submitting ? (isEdit ? 'Modification...' : 'Création...') : (isEdit ? 'Modifier' : 'Créer')}
              </Button>
            </Box>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ProgressionBuilder;
