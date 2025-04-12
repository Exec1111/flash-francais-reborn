import React from 'react';
import { useLocation } from 'react-router-dom';
import ObjectiveForm from '../../components/objectives/ObjectiveForm';

const NewObjective = () => {
  const location = useLocation();
  
  // Récupérer des paramètres éventuels depuis l'URL
  const searchParams = new URLSearchParams(location.search);
  const sessionId = searchParams.get('sessionId');
  
  // Données initiales pour le formulaire
  const initialData = {
    title: '',
    description: '',
    session_ids: sessionId ? [parseInt(sessionId, 10)] : []
  };

  return (
    <ObjectiveForm 
      isDialog={false} 
      initialData={initialData} 
      isEdit={false}
    />
  );
};

export default NewObjective;
