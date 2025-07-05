import React from 'react';
import { useParams } from 'react-router-dom';
import { Box } from '@mui/material';
import SessionSummaryResourceGenerator from '../../components/sessions/SessionSummaryResourceGenerator';

/**
 * Page dédiée à la génération de la fiche de séance (mode plein écran).
 * Calquée sur SequenceSummaryResourcePage pour un comportement homogène.
 */
const SessionSummaryResourcePage = () => {
  const { id } = useParams();

  return (
    <Box sx={{ width: '100%', p: 1 }}>
      <SessionSummaryResourceGenerator sessionId={id} isPage={true} />
    </Box>
  );
};

export default SessionSummaryResourcePage;
