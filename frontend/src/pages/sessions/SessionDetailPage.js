import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Divider,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip
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
      <Paper elevation={2} sx={{ p: 3 }}>
        {/* En-tête */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <IconButton onClick={() => navigate(-1)} sx={{ mr: 2 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" component="h1" flexGrow={1}>
            {session.name}
          </Typography>
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
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Détails de la séance */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Description
                </Typography>
                <Typography paragraph>
                  {session.description || 'Aucune description disponible'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Informations
                </Typography>
                <Box sx={{ my: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Durée
                  </Typography>
                  <Typography variant="body1">
                    {session.duration} minutes
                  </Typography>
                </Box>
                <Box sx={{ my: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Séquence parente
                  </Typography>
                  <Typography variant="body1">
                    {session.sequence_name || 'Non spécifiée'}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Actions */}
        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
          <Button 
            variant="contained" 
            color="primary"
            onClick={() => navigate(`/sessions/edit/${id}`)}
            startIcon={<EditIcon />}
          >
            Modifier
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default SessionDetailPage;
