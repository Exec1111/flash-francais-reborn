import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Button, 
  IconButton,
  Card,
  CardContent,
  CardHeader,
  CardActions,
  Divider,
  Grid,
  Chip,
  CircularProgress,
  Alert
} from '@mui/material';
import { 
  Edit as EditIcon, 
  Delete as DeleteIcon,
  Add as AddIcon,
  AssignmentTurnedIn as ObjectiveIcon
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import sequenceService from '../../services/sequenceService';
import SequenceForm from './SequenceForm';

/**
 * Composant affichant les détails d'une séquence et permettant
 * sa modification ou suppression
 */
const SequenceDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [sequence, setSequence] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  
  // Charger les détails de la séquence
  useEffect(() => {
    const fetchSequence = async () => {
      try {
        setLoading(true);
        const data = await sequenceService.getSequenceById(id);
        setSequence(data);
        setError('');
      } catch (err) {
        setError("Erreur lors du chargement de la séquence: " + 
          (err.detail || err.message || "Erreur inconnue"));
      } finally {
        setLoading(false);
      }
    };
    
    fetchSequence();
  }, [id]);
  
  // Gérer la suppression de la séquence
  const handleDelete = async () => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer cette séquence ? Cette action est irréversible.")) {
      try {
        await sequenceService.deleteSequence(id);
        // Rediriger vers la page des progressions
        navigate('/');
      } catch (err) {
        setError("Erreur lors de la suppression: " + 
          (err.detail || err.message || "Erreur inconnue"));
      }
    }
  };
  
  // Gérer la mise à jour réussie d'une séquence
  const handleUpdateSuccess = (updatedSequence) => {
    setSequence(updatedSequence);
    setEditDialogOpen(false);
  };
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }
  
  if (!sequence) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">Séquence non trouvée</Alert>
      </Box>
    );
  }
  
  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      <Card>
        <CardHeader
          title={
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography variant="h5" component="div">
                {sequence.title}
              </Typography>
            </Box>
          }
          action={
            <Box>
              <IconButton 
                color="primary" 
                onClick={() => setEditDialogOpen(true)} 
                title="Modifier la séquence"
              >
                <EditIcon />
              </IconButton>
              <IconButton 
                color="error" 
                onClick={handleDelete} 
                title="Supprimer la séquence"
              >
                <DeleteIcon />
              </IconButton>
            </Box>
          }
        />
        
        <Divider />
        
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="subtitle1" fontWeight="bold">
                Description:
              </Typography>
              <Typography paragraph>
                {sequence.description || "Aucune description disponible."}
              </Typography>
            </Grid>
            
            {sequence.objectives && sequence.objectives.length > 0 && (
              <Grid item xs={12}>
                <Typography variant="subtitle1" fontWeight="bold">
                  Objectifs pédagogiques:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                  {sequence.objectives.map(objective => (
                    <Chip 
                      key={objective.id} 
                      label={objective.title} 
                      icon={<ObjectiveIcon />} 
                      variant="outlined" 
                      color="secondary"
                      onClick={() => navigate(`/objectives/${objective.id}`)}
                    />
                  ))}
                </Box>
              </Grid>
            )}
            
            <Grid item xs={12}>
              <Typography variant="subtitle1" fontWeight="bold">
                Séances:
              </Typography>
              {sequence.sessions && sequence.sessions.length > 0 ? (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 1 }}>
                  {sequence.sessions.map(session => (
                    <Paper 
                      key={session.id} 
                      elevation={1} 
                      sx={{ p: 2, maxWidth: '250px', cursor: 'pointer' }}
                      onClick={() => navigate(`/sessions/${session.id}`)}
                    >
                      <Typography variant="subtitle2">
                        {session.title}
                      </Typography>
                    </Paper>
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Aucune session dans cette séquence.
                </Typography>
              )}
            </Grid>
          </Grid>
        </CardContent>
        
        <Divider />
        
        <CardActions>
          <Button 
            startIcon={<AddIcon />} 
            variant="contained" 
            color="primary"
            onClick={() => navigate(`/sequences/${id}/sessions/new`)}
          >
            Ajouter une session
          </Button>
          <Button
            startIcon={<ObjectiveIcon />}
            variant="outlined"
            color="secondary"
            onClick={() => navigate(`/sequences/${id}/objectives/manage`)}
          >
            Gérer les objectifs
          </Button>
          <Button 
            onClick={() => navigate(-1)} 
            variant="outlined"
            sx={{ ml: 'auto' }}
          >
            Retour
          </Button>
        </CardActions>
      </Card>
      
      {/* Dialogue pour l'édition */}
      <SequenceForm
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        isDialog={true}
        isEdit={true}
        sequenceId={id}
        initialData={sequence}
        onSuccess={handleUpdateSuccess}
      />
    </Box>
  );
};

export default SequenceDetails;
