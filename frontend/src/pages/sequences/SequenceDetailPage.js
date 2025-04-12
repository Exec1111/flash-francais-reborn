import React from 'react';
import SequenceDetails from '../../components/sequences/SequenceDetails';
import { Box } from '@mui/material';

/**
 * Page de détails d'une séquence
 */
const SequenceDetailPage = () => {
  return (
    <Box sx={{ width: '100%', p: 1 }}>
      <SequenceDetails />
    </Box>
  );
};

export default SequenceDetailPage;
