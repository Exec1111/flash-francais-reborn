import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
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
  Link,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  ArrowBack as ArrowBackIcon,
  Psychology as PsychologyIcon,
  Launch as LaunchIcon
} from '@mui/icons-material';
import api, { API_BASE_URL } from '../../services/api';

import { useTreeData } from '../../contexts/TreeDataContext';
import objectiveService from '../../services/objectiveService';
import sessionService from '../../services/sessionService';
import resourceService from '../../services/resourceService';

import ResourceGenerationWizard from '../../components/ResourceGenerationWizard';

/**
 * Page pour afficher les détails d'une séance
 */
const SessionDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { refreshTreeData } = useTreeData();
  
  // États principaux
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [objectives, setObjectives] = useState([]);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [ficheUrlResolved, setFicheUrlResolved] = useState('');

  // Résolution automatique de l'URL de la fiche lorsque la session change
  useEffect(() => {
    const resolveFiche = async () => {
      if (!session) return;
      let url = session.fiche_url;
      if (!url && session.fiche_resource_id) {
        try {
          const res = await resourceService.getById(session.fiche_resource_id);
          url = res?.html_content_url || res?.file_url || (res?.file_path ? `/media/uploads/${res.file_path}` : '');
        } catch (e) {
          console.error('Erreur résolution fiche', e);
        }
      }
      if (url && !url.startsWith('http')) {
        url = `${API_BASE_URL}${url}`;
      }
      setFicheUrlResolved(url || '');
    };
    resolveFiche();
  }, [session]);

  const openFicheInNewTab = async () => {
    try {
      const url = ficheUrlResolved;
      if (url) {
        window.open(url, '_blank');
      } else {
        alert('URL de la fiche introuvable');
      }
    } catch (e) {
      console.error(e);
      alert('Impossible d\'ouvrir la fiche');
    }
  };

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
        // Extraire les IDs des objectifs (vérifier si tableau d'objets ou tableau d'IDs)
        const objectiveIds = response.data.objectives.map(obj => 
          typeof obj === 'object' && obj !== null ? obj.id : obj
        );
        console.log("Objectifs IDs à récupérer:", objectiveIds);
        const objectiveDetails = await objectiveService.getObjectivesByIds(objectiveIds);
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

  const handleOpenFicheGenerator = () => {
    navigate(`/sessions/${id}/build-fiche`);
  };

  const handleOpenWizard = () => {
    setWizardOpen(true);
  };

  const handleWizardClose = (needsRefresh = false) => {
    console.log('[SessionDetailPage] handleWizardClose appelé', { needsRefresh });
    setWizardOpen(false);
    if (needsRefresh) {
      fetchSessionDetails(); // Recharger les détails de la session pour afficher les nouvelles ressources
    }
  };

  // Fonction appelée lorsque des ressources sont générées avec succès
  const handleResourcesGenerated = async (newResources) => {
    console.log("[SessionDetailPage] Ressources générées (brut):", newResources);
    const safeResources = Array.isArray(newResources) ? newResources.filter(r => r && r.id) : [];
    console.log('[SessionDetailPage] Ressources générées (filtrées):', safeResources);
    // Ne plus attacher automatiquement de fiche ici; laisser l'utilisateur décider explicitement
    // Rafraîchir les détails de la session pour afficher d'éventuelles nouvelles ressources
    fetchSessionDetails();
  };

  const handleDetachFiche = async () => {
    try {
      await sessionService.detachFiche(session.id);
      fetchSessionDetails(); // Recharger les détails de la session pour afficher la fiche détachée
    } catch (err) {
      console.error('Erreur lors du détachement de la fiche:', err);
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

  // Comportement: plus de modal pour la fiche; navigation vers page dédiée
  if (wizardOpen) {
    return (
      <ResourceGenerationWizard
        sessionId={String(session.id)}
        sessionTitle={session.title}
        sequenceId={session.sequence_id}
        onClose={handleWizardClose}
        onResourcesGenerated={handleResourcesGenerated}
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
              {session.fiche_resource_id ? (
                <>
                <Button variant="contained" color="secondary" onClick={handleOpenFicheGenerator} sx={{ mr: 1 }}>
                  Re-générer la fiche de séance
                </Button>

                </>
              ) : (
                <Button variant="contained" color="primary" onClick={handleOpenFicheGenerator} sx={{ mr: 1 }}>
                  Générer la fiche
                </Button>
              )}
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

          {session.fiche_resource_id && (
            <>
              <Divider sx={{ my: 3 }} />
              <Box sx={{ mt: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Fiche de séance
                </Typography>
                <Link component="button" onClick={openFicheInNewTab} sx={{ display:'flex', alignItems:'center', background:'none', border:0, p:0, m:0, cursor:'pointer', color:'inherit', textAlign:'left' }}>
                    <LaunchIcon sx={{ mr:0.5 }} />
                    Voir la fiche de séance
                  </Link>
              </Box>
            </>
          )}

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

          {/* Section Œuvres associées */}
          <Typography variant="h6" gutterBottom>
            Œuvres associées
          </Typography>
          {session.oeuvres && session.oeuvres.length > 0 ? (
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" mb={1}>
              {session.oeuvres.map((oeuvre) => (
                <Chip
                  key={oeuvre.id}
                  label={`${oeuvre.titre} - ${oeuvre.auteur_complet}`}
                  size="small"
                  onClick={() => navigate(`/oeuvres/${oeuvre.id}`)}
                  sx={{
                    backgroundColor: 'primary.light',
                    color: 'primary.contrastText',
                    '&:hover': {
                      backgroundColor: 'primary.main',
                    }
                  }}
                />
              ))}
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Aucune œuvre n'est associée à cette séance pour le moment.
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
                  onClick={() => navigate(`/resources/view/${resource.id}`)}
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
