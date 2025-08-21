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
  Snackbar
} from '@mui/material';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import studyObjectService from '../../services/studyObjectService';

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

  // Plus d'association directe avec des ressources

  const navigate = useNavigate();
  const DRAFT_KEY = `editSO_draft_${id}`;

  // Autosauvegarde du brouillon à chaque modification (avec garde contre l'écrasement par des valeurs vides)
  useEffect(() => {
    try {
      const isAllEmpty = (!title || title === '') && (!description || description === '');
      if (isAllEmpty) return; // ne pas écraser un brouillon existant par des valeurs vides au premier rendu
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ title, description }));
    } catch (_) {}
  }, [title, description, DRAFT_KEY]);

  // Vérifier si on revient d'une autre page avec une demande de rafraîchissement
  useEffect(() => {
    const st = location.state;
    if (!st) return;
    // Logique de refresh explicite
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
        description
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
