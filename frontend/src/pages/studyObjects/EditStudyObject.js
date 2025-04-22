import React, { useState, useEffect } from 'react';
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
import { useNavigate, useParams } from 'react-router-dom';
import studyObjectService from '../../services/studyObjectService';
import ResourceSelectorModal from '../../components/resources/ResourceSelectorModal';
import resourceService from '../../services/resourceService';

const EditStudyObject = () => {
  const { id } = useParams();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Gestion des ressources associées
  const [associatedResources, setAssociatedResources] = useState([]);
  const [resourceModalOpen, setResourceModalOpen] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await studyObjectService.getStudyObjectById(id);
        setTitle(data.title);
        setDescription(data.description || '');
        // Charger les ressources associées si présentes
        if (data.resource_ids && data.resource_ids.length > 0) {
          // Récupérer les objets complets pour affichage
          const resObjs = await Promise.all(
            data.resource_ids.map(rid => resourceService.getResourceById(rid))
          );
          setAssociatedResources(resObjs);
        } else {
          setAssociatedResources([]);
        }
      } catch (err) {
        setError(err.detail || err.message || 'Erreur inconnue');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await studyObjectService.updateStudyObject(id, {
        title,
        description,
        resource_ids: associatedResources.map(r => r.id)
      });
      setSuccess("Objet d'étude mis à jour avec succès !");
      setTimeout(() => navigate('/study-objects'), 1000);
    } catch (err) {
      setError(err.detail || err.message || "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveResource = (rid) => {
    setAssociatedResources(associatedResources.filter(r => r.id !== rid));
  };

  if (loading && !success) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4 }}>
      <Card>
        <CardContent>
          <Typography variant="h5" component="h1" gutterBottom>
            Éditer l'objet d'étude
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
            <Box sx={{ mt: 2, mb: 1 }}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Ressources associées
              </Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setResourceModalOpen(true)}
                sx={{ mb: 1 }}
              >
                Associer une ressource existante
              </Button>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                {associatedResources.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    Aucune ressource associée.
                  </Typography>
                ) : (
                  associatedResources.map(res => (
                    <Chip
                      key={res.id}
                      label={res.title || res.name || `Ressource ${res.id}`}
                      onDelete={() => handleRemoveResource(res.id)}
                      sx={{ maxWidth: 220 }}
                    />
                  ))
                )}
              </Box>
            </Box>
            {error && (
              <Alert severity="error" sx={{ my: 2 }} onClose={() => setError(null)}>
                {error}
              </Alert>
            )}
            {success && (
              <Alert severity="success" sx={{ my: 2 }}>
                {success}
              </Alert>
            )}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
              <Button
                variant="contained"
                color="primary"
                type="submit"
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : null}
              >
                Enregistrer
              </Button>
              <Button
                variant="outlined"
                color="secondary"
                sx={{ ml: 2 }}
                onClick={() => navigate('/study-objects')}
                disabled={loading}
              >
                Annuler
              </Button>
            </Box>
          </form>
        </CardContent>
      </Card>
      <ResourceSelectorModal
        open={resourceModalOpen}
        onClose={() => setResourceModalOpen(false)}
        initialSelectedResources={associatedResources}
        onSave={setAssociatedResources}
      />
    </Box>
  );
};

export default EditStudyObject;
