import React from 'react';
import { useLocation, useParams } from 'react-router-dom';
import SequenceForm from '../../components/sequences/SequenceForm';

/**
 * Page pour créer une nouvelle séquence
 */
const NewSequence = () => {
  const location = useLocation();
  const { progressionId } = useParams();
  
  // Récupérer des paramètres éventuels depuis l'URL
  const searchParams = new URLSearchParams(location.search);
  const progressionIdFromQuery = searchParams.get('progressionId');
  
  // Utiliser l'ID de progression depuis l'URL ou le paramètre de requête
  // Convertir explicitement en nombre entier
  const effectiveProgressionId = progressionId ? parseInt(progressionId, 10) : 
                               progressionIdFromQuery ? parseInt(progressionIdFromQuery, 10) : null;
  
  console.log('ID de progression fourni:', { 
    progressionId, 
    progressionIdFromQuery, 
    effectiveProgressionId,
    typeOfProgressionId: typeof effectiveProgressionId
  });
  
  // Données initiales pour le formulaire
  const initialData = {
    title: '',
    description: '',
    progression_id: effectiveProgressionId // Déjà converti en nombre ci-dessus
  };
  
  console.log('Données initiales du formulaire:', initialData);

  return (
    <SequenceForm 
      isDialog={false} 
      initialData={initialData} 
      isEdit={false}
      progressionId={effectiveProgressionId ? parseInt(effectiveProgressionId, 10) : null}
    />
  );
};

export default NewSequence;
