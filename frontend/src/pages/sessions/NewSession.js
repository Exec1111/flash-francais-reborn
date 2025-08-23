import React, { useState, useEffect } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import SessionForm from '../../components/sessions/SessionForm';
import sequenceService from '../../services/sequenceService';

/**
 * Page pour créer une nouvelle séance
 */
const NewSession = () => {
  const location = useLocation();
  const { sequenceId } = useParams();
  const [nextOrder, setNextOrder] = useState(1);
  const [loading, setLoading] = useState(false);

  // Récupérer des paramètres éventuels depuis l'URL
  const searchParams = new URLSearchParams(location.search);
  const sequenceIdFromQuery = searchParams.get('sequenceId');

  // Récupérer le contexte depuis l'état de navigation
  const contextState = location.state || {};
  const sequenceIdFromState = contextState.sequenceId;
  const returnPath = contextState.returnPath;

  // Utiliser l'ID de séquence depuis l'URL, le paramètre de requête, ou l'état
  // Convertir explicitement en nombre entier
  const effectiveSequenceId = sequenceId ? parseInt(sequenceId, 10) :
                              sequenceIdFromQuery ? parseInt(sequenceIdFromQuery, 10) :
                              sequenceIdFromState ? parseInt(sequenceIdFromState, 10) : null;

  // Calculer l'ordre suivant pour la nouvelle séance
  useEffect(() => {
    const calculateNextOrder = async () => {
      if (!effectiveSequenceId) return;

      setLoading(true);
      try {
        const sessions = await sequenceService.getSequenceSessions(effectiveSequenceId);
        if (sessions && sessions.length > 0) {
          // Trouver le maximum des valeurs d'ordre actuelles
          const maxOrder = Math.max(...sessions.map(session => session.order || 0));
          setNextOrder(maxOrder + 1);
        } else {
          setNextOrder(1);
        }
      } catch (error) {
        console.error('Erreur lors du calcul de l\'ordre suivant:', error);
        setNextOrder(1);
      } finally {
        setLoading(false);
      }
    };

    calculateNextOrder();
  }, [effectiveSequenceId]);

  // Données initiales pour le formulaire
  const initialData = {
    name: 'Nouvelle séance',
    description: '',
    duration: 60,
    order: nextOrder,
    sequence_id: effectiveSequenceId // Déjà converti en nombre ci-dessus
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
        <p>Calcul de l'ordre de la séance...</p>
      </div>
    );
  }

  return (
    <SessionForm
      isDialog={false}
      initialData={initialData}
      isEdit={false}
      sequenceId={effectiveSequenceId}
      returnPath={returnPath}
    />
  );
};

export default NewSession;
