import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Button,
  Grid,
  Card,
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
  Box
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import api from '../../services/api';
import { useTreeData } from '../../contexts/TreeDataContext';
import objectiveService from '../../services/objectiveService';

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
  const [objectives, setObjectives] = useState([]);

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
        // Récupération des objectifs associés
        const objectivesData = await objectiveService.getObjectivesBySession(id);
        setObjectives(objectivesData);
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
      <Container maxWidth="md" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  if (!session) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="warning">Séance non trouvée</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h4" component="h1" gutterBottom>
              {session.title}
            </Typography>
            <Box>
              <Button 
                variant="contained" 
                startIcon={<EditIcon />} 
                onClick={() => navigate(`/sessions/edit/${id}`)}
                sx={{ mr: 1 }}
              >
                Modifier
              </Button>
              <IconButton color="error" onClick={handleDelete}>
                <DeleteIcon />
              </IconButton>
            </Box>
          </Box>

          {/* Date de la séance */}
          {session.date || session.session_date ? (
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Date : {session.date || session.session_date}
            </Typography>
          ) : null}

          <Typography variant="body1" color="text.secondary" paragraph>
            {session.notes || session.description || 'Aucune description disponible'}
          </Typography>

          <Divider sx={{ my: 3 }} />

          {/* Informations (Durée, Séquence parente) */}
          <Typography variant="h6" gutterBottom>
            Informations
          </Typography>
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
                ID: {session.sequence_id || 'Non spécifiée'}
              </Typography>
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          {/* Section Objectifs pédagogiques */}
          <Typography variant="h6" gutterBottom>
            Objectifs pédagogiques
          </Typography>
          {objectives && objectives.length > 0 ? (
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
              {objectives.map(obj => (
                <Chip
                  key={obj.id}
                  label={obj.title}
                  onClick={() => navigate(`/objectives/${obj.id}`)}
                  sx={{ cursor: 'pointer' }}
                />
              ))}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Aucun objectif pédagogique n'est associé à cette séance pour le moment.
            </Typography>
          )}

          <Divider sx={{ my: 3 }} />

          {/* Section Ressources */}
          <Typography variant="h6" gutterBottom>
            Ressources liées
          </Typography>
          {session.resources && session.resources.length > 0 ? (
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" mb={1}>
              {session.resources.map((resource) => (
                <Chip
                  key={resource.id}
                  label={resource.title || resource.name || `Ressource ${resource.id}`}
                  size="small"
                  onClick={() => navigate(`/resources/${resource.id}`)}
                />
              ))}
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Aucune ressource n'est associée à cette séance pour le moment.
            </Typography>
          )}
        </CardContent>
      </Card>
    </Container>
  );
};

export default SessionDetailPage;
