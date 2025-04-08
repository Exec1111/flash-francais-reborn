import React, { useState, useEffect } from 'react';
import { Box, CircularProgress, Alert } from '@mui/material';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import ResourceForm from '../../components/resources/ResourceForm';

const ResourceEdit = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
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
        // Construire l'objet initialData pour ResourceForm
        // en utilisant les clés exactes de la réponse API
        // et en s'assurant que les types correspondent (ex: array pour session_ids)
        setResource({
          title: data.title,
          description: data.description || '',
          type_id: data.type_id,
          sub_type_id: data.sub_type_id,
          source_type: data.source_type, // Ajouter le type de source
          file_path: data.file_path || '', // Ajouter le chemin du fichier
          file_name: data.file_name || '', // Ajouter le nom du fichier
          // Utiliser data.session_ids qui est déjà un tableau d'IDs
          session_ids: Array.isArray(data.session_ids) ? data.session_ids : [],
          // url: data.url || '', // Décommenter si le formulaire gère l'URL
          // ai_generated_content: data.ai_generated_content || '', // Décommenter si pertinent
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
      resourceId={id}
    />
  );
};

export default ResourceEdit;
