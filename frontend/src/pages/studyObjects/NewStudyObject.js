import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  Chip
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import studyObjectService from '../../services/studyObjectService';
import ResourceSelectorModal from '../../components/resources/ResourceSelectorModal';

const NewStudyObject = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Gestion des ressources associées
  const [associatedResources, setAssociatedResources] = useState([]);
  const [resourceModalOpen, setResourceModalOpen] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      // Préparation des identifiants des ressources associées
      const resourceIds = associatedResources.map(resource => resource.id);
      
      const data = {
        title,
        description,
        resourceIds: resourceIds // Ajouter les identifiants des ressources associées
      };
      
      console.log('Création d\'objet d\'étude avec les ressources:', resourceIds);
      await studyObjectService.createStudyObject(data);
      setSuccess('Objet d\'étude créé avec succès !');
      setTimeout(() => navigate('/study-objects'), 1000);
    } catch (err) {
      setError(err.detail || err.message || "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };
  
  // Gérer la suppression d'une ressource associée
  const handleRemoveResource = (rid) => {
    setAssociatedResources(associatedResources.filter(r => r.id !== rid));
  };

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4 }}>
      <Card>
        <CardContent>
          <Typography variant="h5" component="h1" gutterBottom>
            Créer un nouvel objet d'étude
          </Typography>
          <form onSubmit={handleSubmit}>
            <TextField
              label="Titre"
              value={title}
              onChange={e => setTitle(e.target.value)}
              fullWidth
              required
              margin="normal"
            />
            <TextField
              label="Description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              fullWidth
              margin="normal"
              multiline
              minRows={3}
            />
            
            {/* Section des ressources associées */}
            <Box sx={{ mt: 2, mb: 1 }}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Ressources associées (œuvres)
              </Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setResourceModalOpen(true)}
                sx={{ mb: 1 }}
              >
                Associer une œuvre existante
              </Button>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                {associatedResources.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    Aucune œuvre associée pour le moment.
                  </Typography>
                ) : (
                  associatedResources.map(resource => (
                    <Chip
                      key={resource.id}
                      label={resource.title}
                      onDelete={() => handleRemoveResource(resource.id)}
                      sx={{ m: 0.5 }}
                    />
                  ))
                )}
              </Box>
            </Box>
            
            {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mt: 2 }}>{success}</Alert>}
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
              <Button
                variant="outlined"
                onClick={() => navigate('/study-objects')}
                disabled={loading}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : null}
              >
                Créer
              </Button>
            </Box>
          </form>
        </CardContent>
      </Card>
      
      {/* Modal de sélection de ressources */}
      <ResourceSelectorModal
        open={resourceModalOpen}
        onClose={() => setResourceModalOpen(false)}
        initialSelectedResources={associatedResources}
        onSave={setAssociatedResources}
        filterType="OEUVRE" // Filtre pour n'afficher que les ressources de type "œuvre"
      />
    </Box>
  );
};

export default NewStudyObject;
