import React from 'react';
import ManageSequenceObjectives from '../../components/sequences/ManageSequenceObjectives';
import { Box } from '@mui/material';

/**
 * Page pour gérer les objectifs pédagogiques d'une séquence
 */
const ManageSequenceObjectivesPage = () => {
  return (
    <Box sx={{ width: '100%', p: 1 }}>
      <ManageSequenceObjectives />
    </Box>
  );
};

export default ManageSequenceObjectivesPage;
