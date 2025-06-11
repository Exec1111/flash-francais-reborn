import React, { useState, useEffect } from 'react';
import api from '../services/api'; // Importer l'instance API
import {
  Box,
  Typography,
  Button,
  Container,
  Grid,
  Card,
  CardContent,
  CardActions,
  Divider,
  useTheme,
  CircularProgress,
  Alert,
  AlertTitle,
  List,
  ListItem
} from '@mui/material';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import BarChartIcon from '@mui/icons-material/BarChart';
import PeopleIcon from '@mui/icons-material/People';
import AddIcon from '@mui/icons-material/Add';
import { Link as RouterLink, useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const theme = useTheme();
  const [summary, setSummary] = useState({ stats: [], warnings: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  console.log('Dashboard render');

  useEffect(() => {
    const fetchDashboardSummary = async () => {
      setLoading(true);
      setError(null);
      try {
        // Le token est automatiquement ajouté par l'intercepteur Axios
        const response = await api.get('/dashboard/summary');
        setSummary(response.data);
      } catch (err) {
        console.error("Erreur lors de la récupération du résumé du dashboard:", err);
        // L'intercepteur Axios gère déjà la déconnexion en cas de 401
        // Pour les autres erreurs, on peut afficher le message du backend s'il existe
        setError(err.response?.data?.detail || err.message || 'Une erreur est survenue');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardSummary();
  }, []); 

  const getStatValue = (key, defaultValue = 'N/A') => {
    const stat = summary.stats.find(s => s.key === key);
    return stat ? stat.value : defaultValue;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Bienvenue sur votre tableau de bord
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <AlertTitle>Erreur</AlertTitle>
          {error}
        </Alert>
      )}
      {summary.warnings.length > 0 && (
        <Box sx={{ mb: 3 }}>
          {summary.warnings.map((warning) => {
            // Gestion spécifique pour les objectifs non couverts
            if (warning.id.startsWith('uncovered_objectives_')) {
              return (
                <Alert severity="warning" key={warning.id} sx={{ mb: 2 }}>
                  <AlertTitle>Objectifs non couverts dans "{warning.details.sequence_title}"</AlertTitle>
                  {warning.message} {/* Le message est déjà formaté côté backend */} 
                  <List dense disablePadding sx={{ pl: 2, listStyleType: 'disc' }}>
                    {warning.details.uncovered_objectives.map((obj) => (
                      <ListItem key={obj.id} sx={{ display: 'list-item', p: 0 }}>
                        {obj.title}
                      </ListItem>
                    ))}
                  </List>
                </Alert>
              );
            } else {
              // Affichage standard pour les autres types d'avertissements
              return (
                <Alert severity="warning" key={warning.id} sx={{ mb: 2 }}>
                  {warning.message}
                  {/* TODO: Exploiter warning.details si nécessaire pour d'autres types */}
                </Alert>
              );
            }
          })}
        </Box>
      )}
      {/* Le titre est déplacé après le loader/erreur principal */}
      {!loading && !error && (
        <Typography variant="h6" gutterBottom sx={{ mt: summary.warnings.length > 0 ? 4 : 0 }}>Statistiques</Typography>
      )}
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <AutoStoriesIcon sx={{ color: theme.palette.primary.main, mr: 1 }} />
                <Typography variant="h6">Progressions</Typography>
              </Box>
              <Typography variant="h3" color="text.primary">
                {getStatValue('total_progressions')}
              </Typography>
              <Typography color="text.secondary">
                Progressions créées
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <BarChartIcon sx={{ color: theme.palette.secondary.main, mr: 1 }} /> 
                <Typography variant="h6">Séquences</Typography>
              </Box>
              <Typography variant="h3" color="text.primary">
                {getStatValue('total_sequences')}
              </Typography>
              <Typography color="text.secondary">
                ({getStatValue('avg_sequences_per_progression')} / progression)
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <PeopleIcon sx={{ color: theme.palette.success.main, mr: 1 }} /> 
                <Typography variant="h6">Ressources</Typography>
              </Box>
              <Typography variant="h3" color="text.primary">
                {getStatValue('total_resources')}
              </Typography>
              <Typography color="text.secondary">
                ({getStatValue('avg_resources_per_session')} / session)
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box sx={{ mt: 4 }}>
        <Typography variant="h5" gutterBottom>
          Actions Rapides
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Button
            variant="contained"
            color="secondary"
            startIcon={<AddIcon />}
            component={RouterLink}
            to="/progressions/new"
          >
            Nouvelle Progression
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default Dashboard;
