import React, { useState, useEffect } from 'react';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import OeuvreForm from '../../components/oeuvres/OeuvreForm';
import oeuvreService from '../../services/oeuvreService';

const EditOeuvre = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [oeuvre, setOeuvre] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState(null);

  // Charger les données de l'œuvre
  useEffect(() => {
    const loadOeuvre = async () => {
      try {
        setIsLoadingData(true);
        const data = await oeuvreService.getOeuvre(id);
        setOeuvre(data);
      } catch (err) {
        setError('Erreur lors du chargement de l\'œuvre');
        console.error('Erreur chargement œuvre:', err);
      } finally {
        setIsLoadingData(false);
      }
    };

    if (id) {
      loadOeuvre();
    }
  }, [id]);

  const handleSubmit = async (formData) => {
    try {
      setIsLoading(true);
      setError(null);
      
      await oeuvreService.updateOeuvre(id, formData);
      navigate('/oeuvres');
    } catch (err) {
      setError(err.response?.data?.detail || 'Erreur lors de la modification de l\'œuvre');
      console.error('Erreur modification œuvre:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/oeuvres');
  };

  if (isLoadingData) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error && !oeuvre) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Modifier l'œuvre
      </Typography>
      
      {oeuvre && (
        <OeuvreForm
          initialData={oeuvre}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={isLoading}
          error={error}
        />
      )}
    </Box>
  );
};

export default EditOeuvre;
