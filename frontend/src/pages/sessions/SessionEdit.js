import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Box, CircularProgress, Alert } from '@mui/material';
import SessionForm from '../../components/sessions/SessionForm';
import api from '../../services/api';

/**
 * Page pour éditer une séance existante
 */
const SessionEdit = () => {
  const { id } = useParams();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSession = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const response = await api.get(`/sessions/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSession(response.data);
      } catch (err) {
        setError("Erreur lors du chargement de la séance: " + (err.response?.data?.detail || err.message || "Erreur inconnue"));
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
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
    <SessionForm 
      isDialog={false} 
      initialData={session} 
      isEdit={true}
      sessionId={id}
    />
  );
};

export default SessionEdit;
