import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Container, 
  Typography, 
  Card, 
  CardContent, 
  CircularProgress, 
  Alert, 
  Box, 
  Button, 
  List, 
  ListItem, 
  ListItemText, 
  Divider 
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import api from '../../services/api'; // Assurez-vous que le chemin est correct

function ProgressionDetailPage() {
  const { id: progressionId } = useParams();
  const navigate = useNavigate();
  const [progression, setProgression] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProgression = async () => {
      setLoading(true);
      setError(null);
      try {
        // Note: L'API backend doit pouvoir retourner les séquences associées
        // (potentiellement via eager loading ou un appel séparé si nécessaire)
        const response = await api.get(`/progressions/${progressionId}`);
        setProgression(response.data);
      } catch (err) {
        console.error("Erreur lors de la récupération de la progression:", err);
        setError(err.response?.data?.detail || 'Une erreur est survenue lors du chargement de la progression.');
      } finally {
        setLoading(false);
      }
    };

    fetchProgression();
  }, [progressionId]);

  const handleEdit = () => {
    navigate(`/progressions/edit/${progressionId}`);
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

  if (!progression) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="warning">Progression non trouvée.</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h4" component="h1" gutterBottom>
              {progression.title}
            </Typography>
            <Button 
              variant="contained" 
              startIcon={<EditIcon />} 
              onClick={handleEdit}
            >
              Modifier
            </Button>
          </Box>
          
          <Typography variant="body1" color="text.secondary" paragraph>
            {progression.description || 'Aucune description fournie.'}
          </Typography>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h6" gutterBottom>
            Séquences associées
          </Typography>
          {progression.sequences && progression.sequences.length > 0 ? (
            <List disablePadding>
              {progression.sequences.map((sequence) => (
                <ListItem 
                  key={sequence.id} 
                  // Optional: Make list items clickable to navigate to sequence detail
                  // button 
                  // onClick={() => navigate(`/sequences/${sequence.id}`)}
                  divider
                >
                  <ListItemText 
                    primary={sequence.title} 
                    // secondary={sequence.description || 'Pas de description'} // Optional secondary text
                  />
                  {/* Add more sequence info or actions here if needed */}
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Aucune séquence n'est associée à cette progression pour le moment.
            </Typography>
          )}
          
        </CardContent>
      </Card>
    </Container>
  );
}

export default ProgressionDetailPage;
