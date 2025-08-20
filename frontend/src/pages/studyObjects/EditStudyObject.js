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
  Chip,
  Snackbar
} from '@mui/material';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import studyObjectService from '../../services/studyObjectService';
import ResourceSelectorModal from '../../components/resources/ResourceSelectorModal';
import resourceService from '../../services/resourceService';

const EditStudyObject = () => {
  const { id } = useParams();
  const location = useLocation();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  // Gestion des ressources associées
  const [associatedResources, setAssociatedResources] = useState([]);
  const [resourceModalOpen, setResourceModalOpen] = useState(false);

  const navigate = useNavigate();
  const DRAFT_KEY = `editSO_draft_${id}`;

  // Autosauvegarde du brouillon à chaque modification (avec garde contre l'écrasement par des valeurs vides)
  useEffect(() => {
    try {
      const isAllEmpty = (!title || title === '') && (!description || description === '') && (!associatedResources || associatedResources.length === 0);
      if (isAllEmpty) return; // ne pas écraser un brouillon existant par des valeurs vides au premier rendu
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ title, description, associatedResources }));
    } catch (_) {}
  }, [title, description, associatedResources, DRAFT_KEY]);

  // Vérifier si on revient d'une autre page avec une demande de rafraîchissement
  useEffect(() => {
    const st = location.state;
    if (!st) return;
    // Cas 1: retour depuis /resources/new avec une ressource créée
    if (st.createdResource) {
      // Fusionner la ressource créée avec les ressources déjà sélectionnées
      const exists = associatedResources.some(r => String(r.id) === String(st.createdResource.id));
      const nextResources = exists ? associatedResources : [...associatedResources, st.createdResource];

      // Préserver le brouillon existant (titre/description) saisi avant la navigation
      let prevDraft = null;
      try {
        const rawDraft = sessionStorage.getItem(DRAFT_KEY);
        prevDraft = rawDraft ? JSON.parse(rawDraft) : null;
      } catch (_) {}

      const draftTitle = (prevDraft && typeof prevDraft.title === 'string') ? prevDraft.title : title;
      const draftDescription = (prevDraft && typeof prevDraft.description === 'string') ? prevDraft.description : description;

      // Mettre à jour l'état et appliquer le brouillon en priorité
      setAssociatedResources(nextResources);
      setTitle(draftTitle);
      setDescription(draftDescription);

      // Mettre à jour le brouillon fusionné
      try {
        sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ title: draftTitle, description: draftDescription, associatedResources: nextResources }));
      } catch (_) {}

      if (st.messageSuccess) {
        setSuccessMessage(st.messageSuccess);
        setSnackbarOpen(true);
      }
      window.history.replaceState({}, document.title);
      return;
    }
    // Cas 2: logique existante de refresh explicite
    if (st.refresh) {
      fetchData();
      if (st.messageSuccess) {
        setSuccessMessage(st.messageSuccess);
        setSnackbarOpen(true);
      }
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

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

  // Charger un brouillon s'il existe, sinon charger depuis l'API
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (raw) {
        const draft = JSON.parse(raw);
        if (draft && typeof draft === 'object') {
          if (typeof draft.title === 'string') setTitle(draft.title);
          if (typeof draft.description === 'string') setDescription(draft.description);
          if (Array.isArray(draft.associatedResources)) setAssociatedResources(draft.associatedResources);
          setLoading(false);
          return; // Ne pas appeler l'API si brouillon présent
        }
      }
    } catch (_) {}
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      // Nettoyer le brouillon après succès
      try { sessionStorage.removeItem(DRAFT_KEY); } catch (_) {}
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
              <Button
                variant="outlined"
                size="small"
                onClick={() => {
                  // Sauvegarder un brouillon avant de naviguer vers la création de ressource
                  try {
                    sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ title, description, associatedResources }));
                  } catch (_) {}
                  const returnTo = encodeURIComponent(location.pathname);
                  // Forcer Type=OEUVRE (verrouillé) et source=fichier (PDF uniquement), masquer SO
                  const url = `/resources/new?source=file&hideSO=1&presetTypeKey=OEUVRE&lockType=1&pdfOnly=1&attachSOId=${id}&returnTo=${returnTo}`;
                  navigate(url);
                }}
                sx={{ mb: 1, ml: 1 }}
              >
                Créer la ressource à partir d'un PDF
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
                onClick={() => { try { sessionStorage.removeItem(DRAFT_KEY); } catch (_) {}; navigate('/study-objects'); }}
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
        filterType="OEUVRE" // Filtre pour n'afficher que les ressources de type "oeuvre"
      />
      
      {/* Notification de succès */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        message={successMessage}
      />
    </Box>
  );
};

export default EditStudyObject;
