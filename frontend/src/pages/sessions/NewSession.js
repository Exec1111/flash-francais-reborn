import React from 'react';
import { useLocation, useParams } from 'react-router-dom';
import SessionForm from '../../components/sessions/SessionForm';

/**
 * Page pour créer une nouvelle séance
 */
const NewSession = () => {
  const location = useLocation();
  const { sequenceId } = useParams();
  
  // Récupérer des paramètres éventuels depuis l'URL
  const searchParams = new URLSearchParams(location.search);
  const sequenceIdFromQuery = searchParams.get('sequenceId');
  
  // Utiliser l'ID de séquence depuis l'URL ou le paramètre de requête
  // Convertir explicitement en nombre entier
  const effectiveSequenceId = sequenceId ? parseInt(sequenceId, 10) : 
                              sequenceIdFromQuery ? parseInt(sequenceIdFromQuery, 10) : null;
  
  // Données initiales pour le formulaire
  const initialData = {
    name: 'Nouvelle séance',
    description: '',
    duration: 60,
    sequence_id: effectiveSequenceId // Déjà converti en nombre ci-dessus
  };

  return (
    <SessionForm 
      isDialog={false} 
      initialData={initialData} 
      isEdit={false}
      sequenceId={effectiveSequenceId}
    />
  );
};

export default NewSession;
