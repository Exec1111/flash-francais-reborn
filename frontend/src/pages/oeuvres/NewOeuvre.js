import React, { useState } from 'react';
import { Box, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import OeuvreForm from '../../components/oeuvres/OeuvreForm';
import oeuvreService from '../../services/oeuvreService';

const NewOeuvre = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (formData) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const newOeuvre = await oeuvreService.createOeuvre(formData);
      navigate('/oeuvres');
    } catch (err) {
      setError(err.response?.data?.detail || 'Erreur lors de la création de l\'œuvre');
      console.error('Erreur création œuvre:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/oeuvres');
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Nouvelle œuvre
      </Typography>
      
      <OeuvreForm
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isLoading={isLoading}
        error={error}
      />
    </Box>
  );
};

export default NewOeuvre;
