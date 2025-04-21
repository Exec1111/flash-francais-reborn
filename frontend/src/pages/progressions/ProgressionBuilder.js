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
  Alert,
  Autocomplete
} from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import progressionService from '../../services/progressionService';
import studyObjectService from '../../services/studyObjectService';
import { useTreeData } from '../../contexts/TreeDataContext'; // Importer le hook

const ProgressionBuilder = () => {
  const { id } = useParams(); // Récupère l'ID de la progression depuis l'URL
  console.log('[ProgressionBuilder] useParams result:', useParams()); // Log de diagnostic
  console.log('[ProgressionBuilder] Extracted id:', id); // Log de diagnostic
  const navigate = useNavigate();
  const { token } = useAuth();
  const isEdit = Boolean(id); // Détermine si on est en mode édition

  const [formData, setFormData] = useState({
    title: '',
    description: ''
  });
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [allStudyObjects, setAllStudyObjects] = useState([]);
  const [selectedStudyObjects, setSelectedStudyObjects] = useState([]);

  // Obtenir la fonction de rafraîchissement du contexte
  const { refreshTreeData } = useTreeData();

  // --- Chargement des objets d'étude au montage ---
  useEffect(() => {
    studyObjectService.getStudyObjects(0, 100).then(objects => {
      setAllStudyObjects(objects.items || objects);
    });
  }, []);

  // --- Chargement des données initiales en mode édition ---
  useEffect(() => {
    if (isEdit && token && id) { // Seulement si en mode édition et le token est disponible
      setLoading(true);
      setError(null);
      console.log(`ProgressionBuilder: Mode édition détecté. Chargement des données pour progression ID: ${id}`);
      progressionService.getProgressionById(id, token)
        .then(data => {
          console.log("ProgressionBuilder: Données reçues:", data);
          setFormData({
            title: data.title,
            description: data.description || '' // Gérer le cas où la description est null
          });
          // Pré-remplir les objets d'étude associés en édition
          if (data.study_object_ids && data.study_object_ids.length > 0) {
            Promise.all(data.study_object_ids.map(objId => studyObjectService.getStudyObjectById(objId)))
              .then(objs => setSelectedStudyObjects(objs));
          } else {
            setSelectedStudyObjects([]);
          }
          setLoading(false);
        })
        .catch(err => {
          console.error("Erreur lors du chargement de la progression:", err);
          setError("Impossible de charger les données de la progression. Vérifiez que l'ID est correct et que vous avez les permissions.");
          setLoading(false);
        });
    }
  }, [id, isEdit, token]); // Déclencher quand l'ID ou le token change

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
        // --- Mise à jour ---
        console.log(`ProgressionBuilder: Mise à jour de la progression ID: ${id}`);
        response = await progressionService.updateProgression(id, formData, token);
        setSuccess('Progression mise à jour avec succès !');
      } else {
        // --- Création ---
        console.log("ProgressionBuilder: Création d'une nouvelle progression.");
        response = await progressionService.createProgression({
          ...formData,
          study_object_ids: selectedStudyObjects.map(obj => obj.id)
        }, token);
        setSuccess('Progression créée avec succès !');
        // navigate(`/progressions/edit/${response.id}`); // Optionnel : rediriger vers édition
      }
      console.log('Réponse du serveur:', response);
      await refreshTreeData(); // Rafraîchir l'arbre après création ou mise à jour
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
            <Autocomplete
              multiple
              options={allStudyObjects}
              getOptionLabel={option => option.title}
              value={selectedStudyObjects}
              onChange={(e, newValue) => setSelectedStudyObjects(newValue)}
              renderInput={params => (
                <TextField {...params} label="Objets d'étude associés" placeholder="Sélectionner..." margin="normal" />
              )}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              sx={{ mt: 2 }}
              disabled={submitting}
            />
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
