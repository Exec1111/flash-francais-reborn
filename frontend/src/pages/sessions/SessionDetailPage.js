import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Grid,
  Card,
  CardHeader,
  CardContent,
  Divider,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  List,
  ListItem,
  ListItemText,
  Chip,
  Stack,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import api from '../../services/api';
import { useTreeData } from '../../contexts/TreeDataContext';

/**
 * Page pour afficher les détails d'une séance
 */
const SessionDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { refreshTreeData } = useTreeData();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Charger les détails de la séance
  useEffect(() => {
    const fetchSessionDetails = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const response = await api.get(`/sessions/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSession(response.data);
      } catch (err) {
        setError("Erreur lors du chargement des détails de la séance: " + 
          (err.response?.data?.detail || err.message || "Erreur inconnue"));
      } finally {
        setLoading(false);
      }
    };

    fetchSessionDetails();
  }, [id]);

  // Gérer la suppression de la séance
  const handleDelete = async () => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette séance ?')) {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        await api.delete(`/sessions/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        refreshTreeData();
        navigate('/');
      } catch (err) {
        setError("Erreur lors de la suppression: " + 
          (err.response?.data?.detail || err.message || "Erreur inconnue"));
        setLoading(false);
      }
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (!session) {
    return <Alert severity="warning">Séance non trouvée</Alert>;
  }

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      {/* Bouton Retour en dehors de la Card */}
      <IconButton onClick={() => navigate(-1)} sx={{ mb: 2 }}>
        <ArrowBackIcon />
      </IconButton>

      <Card>
        <CardHeader
          title="Détails de la séance" // Titre générique pour la carte
          action={
            <Box>
              <Tooltip title="Modifier">
                <IconButton
                  color="primary"
                  onClick={() => navigate(`/sessions/edit/${id}`)}
                  sx={{ mr: 1 }}
                >
                  <EditIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Supprimer">
                <IconButton color="error" onClick={handleDelete}>
                  <DeleteIcon />
                </IconButton>
              </Tooltip>
            </Box>
          }
        />
        <CardContent>
          {/* Titre spécifique de la séance */}
          <Typography variant="h5" component="h1" gutterBottom>
            {session.title} { /* Utilisation de session.title ou session.name selon le modèle */}
          </Typography>

          <Divider sx={{ my: 2 }} />

          {/* Description */}
          <Typography variant="h6" gutterBottom>
            Description
          </Typography>
          <Typography paragraph sx={{ mb: 3 }}>
            {session.notes || 'Aucune description disponible'} { /* Utilisation de session.notes ou session.description */}
          </Typography>

          {/* Informations (Durée, Séquence parente) */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Durée
              </Typography>
              <Typography variant="body1">
                {session.duration ? `${session.duration} minutes` : 'Non spécifiée'}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Séquence parente
              </Typography>
              <Typography variant="body1">
                {/* TODO: Afficher le nom de la séquence si disponible */}
                {/* Par exemple: session.sequence?.title || session.sequence_name || 'Non spécifiée' */}
                ID: {session.sequence_id || 'Non spécifiée'}
              </Typography>
            </Grid>
          </Grid>

          {/* Section Ressources */}
          {session.resources && session.resources.length > 0 && (
            <>
              <Typography variant="h6" gutterBottom sx={{ mt: 3, mb: 1 }}>
                Ressources liées
              </Typography>
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" mb={1}>
                {session.resources.map((resource) => (
                  <Chip
                    key={resource.id}
                    label={resource.title || resource.name || `Ressource ${resource.id}`}
                    size="small"
                  />
                ))}
              </Stack>
            </>
          )}
          {/* Pas de bouton Modifier ici, car il est dans le header */}
        </CardContent>
      </Card>
    </Box>
  );
};

export default SessionDetailPage;
