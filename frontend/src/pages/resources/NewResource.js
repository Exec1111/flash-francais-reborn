import React from 'react';
import { useLocation } from 'react-router-dom';
import ResourceForm from '../../components/resources/ResourceForm';

const NewResource = () => {
  const location = useLocation();
  
  // Récupérer l'ID de l'utilisateur depuis les paramètres de l'URL
  const userId = new URLSearchParams(location.search).get('userId');
  
  // Données initiales pour le formulaire
  const initialData = {
    title: '',
    description: '',
    type_id: '',
    sub_type_id: '',
    content: '',
    user_id: userId || undefined
  };

  return (
    <ResourceForm 
      isDialog={false} 
      initialData={initialData} 
      isEdit={false}
    />
  );
};

export default NewResource;
