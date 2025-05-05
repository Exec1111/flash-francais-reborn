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
  Divider, 
  Chip 
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import api from '../../services/api'; // Assurez-vous que le chemin est correct
import studyObjectService from '../../services/studyObjectService';
import sequenceService from '../../services/sequenceService';
import StudyObjectChips from '../../components/studyObjects/StudyObjectChips';

function ProgressionDetailPage() {
  const { id: progressionId } = useParams();
  const navigate = useNavigate();
  const [progression, setProgression] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [studyObjects, setStudyObjects] = useState([]);
  const [sequences, setSequences] = useState([]);

  useEffect(() => {
    const fetchProgression = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get(`/progressions/${progressionId}`);
        setProgression(response.data);
        // Récupérer les séquences associées à la progression
        if (response.data.sequences && response.data.sequences.length > 0) {
          setSequences(response.data.sequences.map(seq => ({ id: seq.id, title: seq.title })));
        } else if (response.data.sequence_ids && response.data.sequence_ids.length > 0) {
          const seqs = await Promise.all(
            response.data.sequence_ids.map(async seqId => {
              try {
                const seq = await sequenceService.getSequenceById(seqId);
                return { id: seqId, title: seq.title || `Séquence ${seqId}` };
              } catch (e) {
                return { id: seqId, title: `Séquence ${seqId}` };
              }
            })
          );
          setSequences(seqs);
        } else {
          setSequences([]);
        }
        // Récupérer les objets d'étude associés à la progression
        if (response.data.study_object_ids && response.data.study_object_ids.length > 0) {
          const objects = await Promise.all(
            response.data.study_object_ids.map(id => studyObjectService.getStudyObjectById(id))
          );
          setStudyObjects(objects);
        } else {
          setStudyObjects([]);
        }
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
          {sequences.length > 0 ? (
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
              {sequences.map(sequence => (
                <Chip
                  key={sequence.id}
                  label={sequence.title}
                  onClick={() => navigate(`/sequences/${sequence.id}`)}
                  sx={{ cursor: 'pointer' }}
                />
              ))}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Aucune séquence n'est associée à cette progression pour le moment.
            </Typography>
          )}
          
          <Divider sx={{ my: 3 }} />

          <Typography variant="h6" gutterBottom>
            Objets d'étude associés
          </Typography>
          <StudyObjectChips studyObjects={studyObjects} onClick={obj => navigate(`/study-objects/${obj.id}`)} />

          <Divider sx={{ my: 3 }} />
          
        </CardContent>
      </Card>
    </Container>
  );
}

export default ProgressionDetailPage;
