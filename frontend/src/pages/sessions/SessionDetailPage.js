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
  Box,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  ArrowBack as ArrowBackIcon,
  Psychology as PsychologyIcon
} from '@mui/icons-material';
import api from '../../services/api';
import { useTreeData } from '../../contexts/TreeDataContext';
import objectiveService from '../../services/objectiveService';
import ResourceGenerationWizard from '../../components/ResourceGenerationWizard';

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
  const [wizardOpen, setWizardOpen] = useState(false);

  // Fonction pour récupérer les détails de la session
  const fetchSessionDetails = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await api.get(`/sessions/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSession(response.data);
      
      // Récupération des objectifs associés
      if (response.data && response.data.objectives && response.data.objectives.length > 0) {
        const objectiveDetails = await objectiveService.getObjectivesByIds(response.data.objectives);
        setObjectives(objectiveDetails);
      } else {
        // Récupération des objectifs par l'ancienne méthode si nécessaire
        const objectivesData = await objectiveService.getObjectivesBySession(id);
        setObjectives(objectivesData);
      }
      
      setError('');
    } catch (err) {
      console.error("Erreur lors de la récupération des détails de la session:", err);
      setError("Impossible de charger les détails de la session.");
    } finally {
      setLoading(false);
    }
  };

  // Charger les détails de la séance
  useEffect(() => {
    if (id) {
      fetchSessionDetails();
    }
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

  const handleOpenWizard = () => {
    // On a besoin de l'ID de la session et de l'ID de la séquence pour contextualiser les suggestions.
    // Le type/subtype sera déterminé au niveau de la ressource elle-même lors de la sélection du template.
    console.log("État de 'session' au moment de l'appel à handleOpenWizard:", JSON.stringify(session, null, 2));
    if (session && session.id && session.sequence_id) { 
      setWizardOpen(true);
    } else {
      alert("L'ID de la session ou de la séquence est manquant. Impossible de lancer l'assistant.");
      console.error("Tentative d'ouverture du wizard sans ID de session ou de séquence valide:", session);
    }
  };

  const handleWizardClose = (refreshNeeded = true) => {
    setWizardOpen(false);
    // Rafraîchir les données de la session si des ressources ont été ajoutées
    if (refreshNeeded) {
      // Rafraîchir les données de l'arborescence
      refreshTreeData();
      // Rafraîchir les détails de la session
      fetchSessionDetails();
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

  // Si le wizard est ouvert, afficher le wizard en pleine page
  if (wizardOpen) {
    return (
      <ResourceGenerationWizard
        sessionId={session.id}
        sessionTitle={session.title}
        sequenceId={session.sequence_id} 
        onClose={handleWizardClose}
      />
    );
  }

  // Affichage normal de la page de détail de la session
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
                color="secondary" 
                startIcon={<PsychologyIcon />} 
                onClick={handleOpenWizard} 
                sx={{ mr: 1 }}
              >
                Générer Ressources IA
              </Button>
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
