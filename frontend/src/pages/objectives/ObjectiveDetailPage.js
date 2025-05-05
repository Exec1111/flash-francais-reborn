import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  CircularProgress,
  Alert,
  Box,
  Divider,
  IconButton,
  Chip
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import objectiveService from '../../services/objectiveService';
import sequenceService from '../../services/sequenceService';
import sessionService from '../../services/sessionService';

const ObjectiveDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [objective, setObjective] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sequences, setSequences] = useState([]);
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    const fetchObjective = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await objectiveService.getObjectiveById(id);
        setObjective(data);
        // Séquences associées (utiliser directement data.sequences si présent)
        if (data.sequences && data.sequences.length > 0) {
          setSequences(data.sequences.map(seq => ({ id: seq.id, title: seq.title })));
        } else if (data.sequence_ids && data.sequence_ids.length > 0) {
          const seqs = await Promise.all(
            data.sequence_ids.map(async seqId => {
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
        // Séances associées (utiliser directement data.sessions si présent)
        if (data.sessions && data.sessions.length > 0) {
          setSessions(data.sessions.map(sess => ({ id: sess.id, title: sess.title })));
        } else if (data.session_ids && data.session_ids.length > 0) {
          const sess = await Promise.all(
            data.session_ids.map(async sessId => {
              try {
                const session = await sessionService.getSessionById(sessId);
                return { id: sessId, title: session.title || `Séance ${sessId}` };
              } catch (e) {
                return { id: sessId, title: `Séance ${sessId}` };
              }
            })
          );
          setSessions(sess);
        } else {
          setSessions([]);
        }
      } catch (err) {
        setError(err.detail || err.message || 'Erreur inconnue');
      } finally {
        setLoading(false);
      }
    };
    fetchObjective();
  }, [id]);

  if (loading) {
    return <CircularProgress sx={{ mt: 6, mx: 'auto', display: 'block' }} />;
  }
  if (error) {
    return <Alert severity="error" sx={{ mt: 6 }}>{error}</Alert>;
  }
  if (!objective) {
    return null;
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h4" gutterBottom>
              {objective.title || 'Objectif pédagogique'}
            </Typography>
            <Box>
              <Button
                variant="contained"
                startIcon={<EditIcon />}
                sx={{ mr: 1 }}
                onClick={() => navigate(`/objectives/edit/${id}`)}
              >
                Modifier
              </Button>
              <IconButton color="error">
                <DeleteIcon />
              </IconButton>
            </Box>
          </Box>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            {objective.description || "Aucune description disponible."}
          </Typography>
          <Divider sx={{ my: 2 }} />

          <Typography variant="h6" gutterBottom>
            Séquences associées
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
            {sequences.map(seq => (
              <Chip
                key={seq.id}
                label={seq.title}
                onClick={() => navigate(`/sequences/${seq.id}`)}
                sx={{ cursor: 'pointer' }}
              />
            ))}
          </Box>
          {sequences.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              Aucune séquence n'est associée à cet objectif pour le moment.
            </Typography>
          )}

          <Divider sx={{ my: 2 }} />

          <Typography variant="h6" gutterBottom>
            Séances associées
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
            {sessions.map(sess => (
              <Chip
                key={sess.id}
                label={sess.title}
                onClick={() => navigate(`/sessions/${sess.id}`)}
                sx={{ cursor: 'pointer' }}
              />
            ))}
          </Box>
          {sessions.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              Aucune séance n'est associée à cet objectif pour le moment.
            </Typography>
          )}
        </CardContent>
      </Card>
    </Container>
  );
};

export default ObjectiveDetailPage;
