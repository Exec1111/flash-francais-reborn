import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  Autocomplete
} from '@mui/material';
import progressionService from '../../services/progressionService';
import studyObjectService from '../../services/studyObjectService';

const ProgressionEditPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [allStudyObjects, setAllStudyObjects] = useState([]);
  const [selectedStudyObjects, setSelectedStudyObjects] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Charger la progression
        const progression = await progressionService.getProgressionById(id);
        setTitle(progression.title);
        setDescription(progression.description || '');
        // Charger tous les objets d'étude
        const objects = await studyObjectService.getStudyObjects(0, 100);
        setAllStudyObjects(objects.items || objects);
        // Charger les objets d'étude déjà associés
        if (progression.study_object_ids && progression.study_object_ids.length > 0) {
          const objs = await Promise.all(
            progression.study_object_ids.map(objId => studyObjectService.getStudyObjectById(objId))
          );
          setSelectedStudyObjects(objs);
        } else {
          setSelectedStudyObjects([]);
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
      // Mettre à jour la progression (titre, description)
      await progressionService.updateProgression(id, { title, description });
      // Associer les objets d'étude sélectionnés
      // 1. On détache tous les objets d'étude existants
      const progression = await progressionService.getProgressionById(id);
      if (progression.study_object_ids && progression.study_object_ids.length > 0) {
        await Promise.all(
          progression.study_object_ids.map(objId => studyObjectService.detachProgression(objId, id))
        );
      }
      // 2. On attache chaque objet sélectionné
      await Promise.all(
        selectedStudyObjects.map(obj => studyObjectService.attachProgression(obj.id, id))
      );
      setSuccess('Progression mise à jour avec succès !');
      setTimeout(() => navigate(`/progressions/${id}`), 1000);
    } catch (err) {
      setError(err.detail || err.message || 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
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
            Éditer la progression
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
                onClick={() => navigate(`/progressions/${id}`)}
                disabled={loading}
              >
                Annuler
              </Button>
            </Box>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ProgressionEditPage;
