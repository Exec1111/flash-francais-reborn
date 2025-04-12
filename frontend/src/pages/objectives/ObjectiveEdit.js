import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, CircularProgress, Alert } from '@mui/material';
import ObjectiveForm from '../../components/objectives/ObjectiveForm';
import objectiveService from '../../services/objectiveService';

const ObjectiveEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [objectiveData, setObjectiveData] = useState(null);

  useEffect(() => {
    const fetchObjectiveData = async () => {
      try {
        const data = await objectiveService.getObjectiveById(id);
        setObjectiveData(data);
      } catch (err) {
        setError(`Erreur lors du chargement de l'objectif: ${err.detail || err.message || 'Erreur inconnue'}`);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchObjectiveData();
    } else {
      setError("ID d'objectif non spécifié");
      setLoading(false);
    }
  }, [id]);

  const handleSuccess = () => {
    // Redirection après modification réussie
    navigate('/objectives');
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ m: 2 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <ObjectiveForm
      isDialog={false}
      initialData={objectiveData}
      isEdit={true}
      objectiveId={id}
      onSuccess={handleSuccess}
    />
  );
};

export default ObjectiveEdit;
