import React from 'react';
import { Button } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { Description as DescriptionIcon } from '@mui/icons-material';

const ResourceButton = () => {
  return (
    <Button
      variant="outlined"
      color="primary"
      startIcon={<DescriptionIcon />}
      component={RouterLink}
      to="/resources"
      fullWidth
      sx={{ justifyContent: 'flex-start' }}
    >
      Ressources/documents
    </Button>
  );
};

export default ResourceButton;
