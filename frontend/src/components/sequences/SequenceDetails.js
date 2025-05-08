import React, { useState, useEffect } from 'react';
import { 
  Container,
  Typography, 
  Button, 
  IconButton,
  Card,
  CardContent,
  Divider,
  Grid,
  Chip,
  CircularProgress,
  Alert,
  Box,
  Paper
} from '@mui/material';
import { 
  Edit as EditIcon, 
  Delete as DeleteIcon,
  Add as AddIcon,
  AssignmentTurnedIn as ObjectiveIcon
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import sequenceService from '../../services/sequenceService';
import studyObjectService from '../../services/studyObjectService';
import StudyObjectChips from '../../components/studyObjects/StudyObjectChips';

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
  const [studyObjectDetailsLoading, setStudyObjectDetailsLoading] = useState(false);
  const [studyObjectHasResources, setStudyObjectHasResources] = useState(false);

  // Charger les détails de la séquence
  useEffect(() => {
    const fetchSequenceAndRelatedData = async () => {
      try {
        setLoading(true);
        setStudyObjectDetailsLoading(true);
        setError('');
        const sequenceData = await sequenceService.getSequenceById(id);
        setSequence(sequenceData);

        if (sequenceData && sequenceData.study_objects && sequenceData.study_objects.length > 0) {
          const mainStudyObjectId = sequenceData.study_objects[0].id;
          if (mainStudyObjectId) {
            try {
              const studyObjectData = await studyObjectService.getStudyObjectById(mainStudyObjectId);
              if (studyObjectData && studyObjectData.resource_ids && studyObjectData.resource_ids.length > 0) {
                setStudyObjectHasResources(true);
              } else {
                setStudyObjectHasResources(false);
              }
            } catch (soError) {
              console.error(`Erreur lors du chargement des détails de l'objet d'étude ${mainStudyObjectId}:`, soError);
              setError(prevError => prevError + (prevError ? "\n" : "") + `Erreur détails objet d'étude: ${soError.detail || soError.message}`);
              setStudyObjectHasResources(false);
            }
          }
        } else {
          setStudyObjectHasResources(false);
        }

      } catch (err) {
        setError("Erreur lors du chargement de la séquence: " + 
          (err.detail || err.message || "Erreur inconnue"));
      } finally {
        setLoading(false);
        setStudyObjectDetailsLoading(false);
      }
    };
    
    fetchSequenceAndRelatedData();
  }, [id]);
  
  // Gérer la suppression de la séquence
  const handleDelete = async () => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer cette séquence ? Cette action est irréversible.")) {
      try {
        await sequenceService.deleteSequence(id);
        navigate('/');
      } catch (err) {
        setError("Erreur lors de la suppression: " + 
          (err.detail || err.message || "Erreur inconnue"));
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
  
  if (!sequence) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="warning">Séquence non trouvée</Alert>
      </Container>
    );
  }
  
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h4" component="h1" gutterBottom>
              {sequence.title}
            </Typography>
            <Box>
              <Button
                variant="contained"
                color="primary"
                onClick={() => navigate(`/sequences/${id}/propose-seances`, { state: { title: sequence.title } })}
                sx={{ mr: 2 }}
                disabled={studyObjectDetailsLoading || !studyObjectHasResources}
                title={
                  studyObjectDetailsLoading ? "Vérification des ressources de l'objet d'étude..." :
                  !sequence.study_objects || sequence.study_objects.length === 0 ? "Aucun objet d'étude n'est lié à cette séquence." :
                  !studyObjectHasResources ? "L'objet d'étude principal lié à cette séquence n'a pas de ressources. Ajoutez des ressources à l'objet d'étude pour générer des séances." :
                  "Générer des propositions de séances basées sur les objets d'étude"
                }
              >
                Proposer des séances
              </Button>
              <Button
                variant="contained"
                startIcon={<EditIcon />}
                onClick={() => navigate(`/sequences/edit/${id}`)}
                sx={{ mr: 2 }}
              >
                Modifier
              </Button>
              <IconButton 
                color="error" 
                onClick={handleDelete} 
                title="Supprimer la séquence"
              >
                <DeleteIcon />
              </IconButton>
            </Box>
          </Box>
          
          <Typography variant="body1" color="text.secondary" paragraph>
            {sequence.description || "Aucune description disponible."}
          </Typography>
        
          <Divider sx={{ my: 3 }} />
          
          {/* Section Objectifs pédagogiques */}
          {sequence.objectives && sequence.objectives.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" gutterBottom onClick={() => navigate(`/objectives/${sequence.objectives[0].id}`)}>
                Objectifs pédagogiques
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                {sequence.objectives.map(obj => (
                  <Chip
                    key={obj.id}
                    label={obj.title}
                    onClick={() => navigate(`/objectives/${obj.id}`)}
                    sx={{ cursor: 'pointer' }}
                    icon={<ObjectiveIcon />}
                  />
                ))}
              </Box>
            </Box>
          )}
          
          <Divider sx={{ my: 3 }} />
          
          {/* Section Objets d'étude */}
          <Typography variant="h6" gutterBottom>
            Objets d'étude associés
          </Typography>
          <StudyObjectChips 
            studyObjects={sequence.study_objects || []} 
            onClick={(obj) => navigate(`/study-objects/${obj.id}`)}
          />
          
          <Divider sx={{ my: 3 }} />
          
          <Typography variant="h6" gutterBottom>
            Séances
          </Typography>
          {sequence.sessions && sequence.sessions.length > 0 ? (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              {sequence.sessions.map(session => (
                <Grid item xs={12} sm={6} md={4} key={session.id}>
                  <Paper 
                    elevation={1} 
                    sx={{ p: 2, height: '100%', cursor: 'pointer' }}
                    onClick={() => navigate(`/sessions/${session.id}`)}
                  >
                    <Typography variant="subtitle1" gutterBottom>
                      {session.title}
                    </Typography>
                    {session.date && (
                      <Typography variant="body2" color="text.secondary">
                        Date: {session.date}
                      </Typography>
                    )}
                    {session.duration && (
                      <Typography variant="body2" color="text.secondary">
                        Durée: {session.duration} minutes
                      </Typography>
                    )}
                  </Paper>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Aucune séance dans cette séquence.
            </Typography>
          )}
          
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
            <Button 
              startIcon={<AddIcon />} 
              variant="contained" 
              color="primary"
              onClick={() => navigate(`/sequences/${id}/sessions/new`)}
            >
              Ajouter une séance
            </Button>
            <Button 
              onClick={() => navigate(-1)} 
              variant="outlined"
            >
              Retour
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
};

export default SequenceDetails;
