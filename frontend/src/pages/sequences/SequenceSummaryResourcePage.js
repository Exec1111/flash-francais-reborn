import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Container, Typography, Paper, CircularProgress } from '@mui/material';
import SequenceSummaryResourceGenerator from '../../components/sequences/SequenceSummaryResourceGenerator';

/**
 * Page pour générer un résumé de séquence pédagogique
 */
const SequenceSummaryResourcePage = () => {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log('[DEBUG] SequenceSummaryResourcePage montée avec ID de séquence:', id);
    // Simulation d'un temps de chargement pour s'assurer que tout est initialisé
    const timer = setTimeout(() => {
      setLoading(false);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [id]);

  if (!id) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ mt: 4, mb: 4 }}>
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="error">Identifiant de séquence manquant.</Typography>
          </Paper>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Générer un résumé de séquence
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            Créez une ressource pédagogique résumant la séquence sélectionnée et ses composants.
          </Typography>
          
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
              <Typography sx={{ ml: 2 }}>Initialisation...</Typography>
            </Box>
          ) : (
            <SequenceSummaryResourceGenerator 
              sequenceId={id} 
              isPage={true} 
              key={`seq-summary-${id}`} // Forcer la réinitialisation du composant
            />
          )}
        </Paper>
      </Box>
    </Container>
  );
};

export default SequenceSummaryResourcePage;
