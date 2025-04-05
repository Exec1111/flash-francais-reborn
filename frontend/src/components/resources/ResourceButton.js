import React from 'react';
import { Button, Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const ResourceButton = () => {
  const navigate = useNavigate();

  const handleManageResources = () => {
    navigate('/resources');
  };

  return (
    <Box sx={{ p: 2, mb: 2, bgcolor: 'background.paper' }}>
      <Button
        variant="contained"
        color="primary"
        fullWidth
        onClick={handleManageResources}
        sx={{
          borderRadius: 2,
          textTransform: 'none',
          fontWeight: 'bold',
          fontSize: '1rem',
          '&:hover': {
            bgcolor: 'primary.dark'
          }
        }}
      >
        Gérer mes ressources
      </Button>
    </Box>
  );
};

export default ResourceButton;
