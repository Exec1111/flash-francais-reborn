import React, { useState, useEffect } from 'react';
import { Box, CircularProgress, Alert } from '@mui/material';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import ResourceForm from '../../components/resources/ResourceForm';

const ResourceEdit = () => {
  const { id } = useParams();
  const [resource, setResource] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Charger les données de la ressource au chargement du composant
  useEffect(() => {
    const fetchResource = async () => {
      try {
        setLoading(true);
        const response = await fetch(`http://localhost:10000/api/v1/resources/${id}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (!response.ok) {
          throw new Error('Erreur lors du chargement de la ressource');
        }

        const data = await response.json();
        console.log('[DEBUG API] Données brutes de l\'API:', data); // Debug complet

        // Construire l'objet initialData pour ResourceForm
        // en conservant TOUS les champs de la réponse API (spread operator)
        setResource({
          ...data, // Garder tous les champs de la réponse API
          title: data.title,
          description: data.description || '',
          type_id: data.type_id,
          sub_type_id: data.sub_type_id,
          source_type: data.source_type, 
          file_path: data.file_path || '', 
          file_name: data.file_name || '', 
          html_url: data.html_url || '', 
          session_ids: Array.isArray(data.session_ids) ? data.session_ids : [],
          // Préserver explicitement les associations avec les objets d'étude
          study_objects: data.study_objects || [],
          study_object_ids: data.study_object_ids || [],
        });
        setLoading(false);
      } catch (err) {
        console.error('Erreur lors du chargement de la ressource:', err);
        setError(err.message || 'Une erreur est survenue');
        setLoading(false);
      }
    };

    fetchResource();
  }, [id]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <ResourceForm 
      isDialog={false} 
      initialData={resource} 
      isEdit={true}
      hideStudyObjectSelection={true}
      resourceId={id}
    />
  );
};

export default ResourceEdit;
