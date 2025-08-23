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
  Paper,
  Link
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  AssignmentTurnedIn as ObjectiveIcon,
  Summarize as SummarizeIcon,
  Launch as LaunchIcon,
  AutoAwesome as AutoAwesomeIcon,
  Event as SessionIcon
} from '@mui/icons-material';
import { Link as RouterLink, useParams, useNavigate } from 'react-router-dom';
import sequenceService from '../../services/sequenceService';
import studyObjectService from '../../services/studyObjectService';
import StudyObjectChips from '../../components/studyObjects/StudyObjectChips';
import SequenceSummaryResourceGenerator from './SequenceSummaryResourceGenerator';
import StudyObjectSelectorModal from '../../components/studyObjects/StudyObjectSelectorModal';
import ObjectiveSelectorModal from './ObjectiveSelectorModal';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:10000';

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
  const [summaryGeneratorOpen, setSummaryGeneratorOpen] = useState(false);
  const [studyObjectModalOpen, setStudyObjectModalOpen] = useState(false);
  const [objectiveModalOpen, setObjectiveModalOpen] = useState(false);
  const [loadingAssociations, setLoadingAssociations] = useState(false);
  const [sessions, setSessions] = useState([]);
  

  // Charger les détails de la séquence
  useEffect(() => {
    const fetchSequenceAndRelatedData = async () => {
      try {
        setLoading(true);
        setStudyObjectDetailsLoading(true);
        setError('');
        const sequenceData = await sequenceService.getSequenceWithObjects(id);
        console.log("Données de la séquence reçues:", sequenceData);
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

        // Récupérer les séances associées à la séquence
        if (sequenceData.id) {
          try {
            const sessionsData = await sequenceService.getSequenceSessions(sequenceData.id);
            setSessions(sessionsData || []);
          } catch (sessionsError) {
            console.error('Erreur lors du chargement des séances:', sessionsError);
            setSessions([]);
          }
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

  // Gérer la sélection d'objets d'étude
  const handleStudyObjectSelection = async (selectedStudyObjects) => {
    try {
      setLoadingAssociations(true);
      // Mettre à jour les objets d'étude liés à la séquence
      const studyObjectIds = selectedStudyObjects.map(studyObject => studyObject.id);

      // Mettre à jour la séquence avec les nouveaux objets d'étude
      await sequenceService.updateSequence(id, {
        ...sequence,
        study_object_ids: studyObjectIds
      });

      // Recharger les données
      const updatedData = await sequenceService.getSequenceWithObjects(id);
      setSequence(updatedData);

      setStudyObjectModalOpen(false);
    } catch (err) {
      console.error("Erreur lors de la mise à jour des objets d'étude:", err);
      setError(err.response?.data?.detail || 'Une erreur est survenue lors de la mise à jour des objets d\'étude.');
    } finally {
      setLoadingAssociations(false);
    }
  };

  // Gérer la sélection d'objectifs
  const handleObjectiveSelection = async (selectedObjectives) => {
    try {
      setLoadingAssociations(true);
      // Mettre à jour les objectifs liés à la séquence
      const objectiveIds = selectedObjectives.map(objective => objective.id);

      // Mettre à jour la séquence avec les nouveaux objectifs
      await sequenceService.updateSequence(id, {
        ...sequence,
        objective_ids: objectiveIds
      });

      // Recharger les données
      const updatedData = await sequenceService.getSequenceWithObjects(id);
      setSequence(updatedData);

      setObjectiveModalOpen(false);
    } catch (err) {
      console.error("Erreur lors de la mise à jour des objectifs:", err);
      setError(err.response?.data?.detail || 'Une erreur est survenue lors de la mise à jour des objectifs.');
    } finally {
      setLoadingAssociations(false);
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
                color={sequence?.bilan_resource ? 'secondary' : 'primary'}
                startIcon={<SummarizeIcon />}
                onClick={() => navigate(`/sequences/${id}/generate-summary`)}
                sx={{ mr: 2 }}
                title={sequence?.bilan_resource ? 'Re-générer le bilan de cette séquence' : 'Générer un bilan de cette séquence'}
              >
                {sequence?.bilan_resource ? 'Re-générer le bilan' : 'Générer le bilan'}
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

          {sequence?.bilan_resource?.html_content_url && (
            <>
              <Divider sx={{ my: 3 }} />
              <Box sx={{ mt: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Bilan de fin de séquence
                </Typography>
                <Link
                  href={`${API_BASE_URL}${sequence.bilan_resource.html_content_url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ display: 'flex', alignItems: 'center' }}
                >
                  <LaunchIcon sx={{ mr: 0.5 }} />
                  Voir le bilan
                </Link>
              </Box>
            </>
          )}
        
          <Divider sx={{ my: 3 }} />
          
          {/* Section Objectifs pédagogiques */}
          <Box sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Typography variant="h6" gutterBottom>
                Objectifs pédagogiques
              </Typography>
              <Button
                variant="outlined"
                onClick={() => setObjectiveModalOpen(true)}
                disabled={loadingAssociations}
              >
                Rattacher/Détacher
              </Button>
            </Box>
            {sequence.objectives && sequence.objectives.length > 0 ? (
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
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Aucun objectif n'est associé à cette séquence pour le moment.
              </Typography>
            )}
          </Box>
          
          <Divider sx={{ my: 3 }} />

          {/* Section Objets d'étude */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Typography variant="h6" gutterBottom>
              Objets d'étude
            </Typography>
            <Button
              variant="outlined"
              onClick={() => setStudyObjectModalOpen(true)}
              disabled={loadingAssociations}
            >
              Rattacher/Détacher
            </Button>
          </Box>
          {sequence.study_objects && sequence.study_objects.length > 0 ? (
            <StudyObjectChips
              studyObjects={sequence.study_objects}
              onClick={(obj) => navigate(`/study-objects/${obj.id}`)}
            />
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Aucun objet d'étude n'est associé à cette séquence pour le moment.
            </Typography>
          )}

          <Divider sx={{ my: 3 }} />

          {/* Section Séances */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Typography variant="h6" gutterBottom>
             Séances
            </Typography>
            <Button
              variant="outlined"
              onClick={() => navigate('/sessions/new', {
                state: {
                  sequenceId: id,
                  sequenceTitle: sequence.title,
                  returnPath: `/sequences/${id}`
                }
              })}
              disabled={loadingAssociations}
            >
              Créer manuellement
            </Button>
              <Button
                variant="contained"
                color="primary"
                onClick={() => navigate(`/sequences/${id}/propose-seances`, { state: { title: sequence.title } })}
                sx={{ mr: 2 }}
                disabled={studyObjectDetailsLoading}
                title={
                  studyObjectDetailsLoading ? "Vérification des ressources de l'objet d'étude..." :
                  !sequence.study_objects || sequence.study_objects.length === 0 ? "Aucun objet d'étude n'est lié à cette séquence." :
                  !studyObjectHasResources ? "L'objet d'étude principal lié à cette séquence n'a pas de ressources. Ajoutez des ressources à l'objet d'étude pour générer des séances." :
                  "Générer des propositions de séances basées sur les objets d'étude"
                }
              >
                Proposer avec l'IA
              </Button>
          </Box>
          {sessions.length > 0 ? (
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
              {[...sessions]
                .sort((a, b) => (a.order || 0) - (b.order || 0))
                .map(session => (
                  <Chip
                    key={session.id}
                    label={session.title || `Séance ${session.id}`}
                    onClick={() => navigate(`/sessions/${session.id}`)}
                    sx={{ cursor: 'pointer' }}
                    icon={<SessionIcon />}
                  />
                ))}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Aucune séance n'est associée à cette séquence pour le moment.
            </Typography>
          )}

          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
            <Button 
              onClick={() => navigate(-1)} 
              variant="outlined"
            >
              Retour
            </Button>
          </Box>
        </CardContent>
      </Card>

      <StudyObjectSelectorModal
        open={studyObjectModalOpen}
        onClose={() => setStudyObjectModalOpen(false)}
        initialSelectedStudyObjects={sequence.study_objects || []}
        onSave={handleStudyObjectSelection}
        progressionId={sequence.progression_id}
      />

      <ObjectiveSelectorModal
        open={objectiveModalOpen}
        onClose={() => setObjectiveModalOpen(false)}
        initialSelectedObjectives={sequence.objectives || []}
        onSave={handleObjectiveSelection}
      />

      {/* Le composant pour générer un bilan de fin de séquence a été déplacé vers une page dédiée */}
    </Container>
  );
};

export default SequenceDetails;
