import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import SequenceForm from '../../components/sequences/SequenceForm';
import { CircularProgress, Box, Alert } from '@mui/material';
import sequenceService from '../../services/sequenceService';

/**
 * Page pour éditer une séquence existante
 */
const SequenceEdit = () => {
  const { id } = useParams();
  const [sequence, setSequence] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSequence = async () => {
      try {
        setLoading(true);
        const data = await sequenceService.getSequenceById(id);
        setSequence(data);
      } catch (err) {
        setError("Erreur lors du chargement de la séquence: " + (err.detail || err.message || "Erreur inconnue"));
      } finally {
        setLoading(false);
      }
    };

    fetchSequence();
  }, [id]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <SequenceForm 
      isDialog={false} 
      initialData={sequence} 
      isEdit={true}
      sequenceId={id}
    />
  );
};

export default SequenceEdit;
