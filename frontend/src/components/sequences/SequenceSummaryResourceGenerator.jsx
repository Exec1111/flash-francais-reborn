import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, 
         CircularProgress, Typography, IconButton, Box, Alert } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ResourceForm from '../resources/ResourceForm';
import sequenceService from '../../services/sequenceService';
import { resourceTypeService } from '../../services/resourceTypeService';

const SequenceSummaryResourceGenerator = ({ 
  sequenceId, 
  open, 
  onClose, 
  onSuccess,
  isPage = false
}) => {
  const navigate = useNavigate();
  const [sequenceData, setSequenceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [alert, setAlert] = useState(null);
  const [resourceTypes, setResourceTypes] = useState([]);
  const [typeSubtypeIds, setTypeSubtypeIds] = useState({ typeId: '', subtypeId: '' });

  useEffect(() => {
    const fetchResourceTypes = async () => {
      try {
        setLoading(true);
        const types = await resourceTypeService.getAllTypes();
        setResourceTypes(types);
        
        const lessonType = types.find(type => type.key.toLowerCase() === 'lecon');
        if (lessonType) {
          const subtypes = await resourceTypeService.getSubtypesByType(lessonType.id);
          const summarySubtype = subtypes.find(subtype => subtype.key.toLowerCase() === 'sequence_summary');
          
          if (summarySubtype) {
            setTypeSubtypeIds({ typeId: lessonType.id, subtypeId: summarySubtype.id });
          } else {
            setError('Sous-type "sequence_summary" non trouvé');
          }
        } else {
          setError('Type de ressource "leçon" non trouvé');
        }
      } catch (err) {
        setError('Impossible de charger les types de ressources');
      } 
    };
    fetchResourceTypes();
  }, []);

  useEffect(() => {
    const fetchSequenceData = async () => {
      if (!sequenceId || !typeSubtypeIds.typeId) return;
      if (!isPage && !open) return;

      try {
        setLoading(true);
        const data = await sequenceService.getSequenceWithObjects(sequenceId);
        const sessions = await sequenceService.getSequenceSessions(sequenceId);
        data.sessions = sessions;
        setSequenceData(data);
      } catch (err) {
        setError('Impossible de charger les données de la séquence');
      } finally {
        setLoading(false);
      }
    };

    fetchSequenceData();
  }, [sequenceId, open, isPage, typeSubtypeIds]);
  
  const prepareInitialData = () => {
    if (!sequenceData) return null;
    return {
      title: `Résumé - ${sequenceData.title}`,
      description: `Document de révision complet pour la séquence "${sequenceData.title}"`,
    };
  };
  
  const transformSequenceDataForAi = () => {
    if (!sequenceData) return null;
    return {
      sequenceId: sequenceData.id,
      titre_sequence: sequenceData.title,
      niveau: sequenceData.level || 'B1',
      objectifs: (sequenceData.objectives || []).map(o => ({ description: o.description })),
      ressources: (sequenceData.resources || []).map(r => ({ titre: r.title, type: r.resource_type?.name || 'Non spécifié' })),
      sessions: (sequenceData.sessions || []).map(s => ({ title: s.title, description: s.description }))
    };
  };

  const handleFormSuccess = async (createdResource) => {
    console.log('[DEBUG] SequenceSummaryResourceGenerator: handleFormSuccess triggered.', { createdResource });

    if (!createdResource) {
        setAlert({ type: 'error', message: 'Erreur: La ressource n\'a pas pu être récupérée.' });
        return;
    }

    const resourceId = typeof createdResource === 'object' ? createdResource.id : createdResource;
    console.log(`[DEBUG] SequenceSummaryResourceGenerator: Extracted resourceId: ${resourceId}`);

    if (!resourceId) {
        setAlert({ type: 'error', message: 'Erreur: L\'ID de la ressource est invalide.' });
        return;
    }

    try {
        console.log(`[DEBUG] Attaching bilan (resource ${resourceId}) to sequence ${sequenceId}.`);
        await sequenceService.attachBilan(sequenceId, resourceId);
        setAlert({ type: 'success', message: 'Bilan généré et attaché avec succès !' });

        if (onSuccess) {
          onSuccess(); // Gère la fermeture/rechargement pour le mode Dialog
        } else if (isPage) {
          // Redirige vers la page de détails pour le mode Page
          navigate(`/sequences/${sequenceId}`);
        }

    } catch (error) {
        const errorMessage = error.response?.data?.detail || 'Erreur lors de l\'attachement du bilan.';
        setAlert({ type: 'error', message: errorMessage });
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
          <Typography sx={{ ml: 2 }}>Chargement...</Typography>
        </Box>
      );
    }

    if (error) {
      return <Typography color="error" sx={{ p: 2 }}>{error}</Typography>;
    }

    return (
      <ResourceForm
        open={isPage ? true : open}
        onClose={isPage ? () => window.history.back() : onClose}
        initialData={prepareInitialData()}
        isDialog={!isPage}
        onSuccess={handleFormSuccess}
        isEdit={false}
        disableSourceSelection={true}
        hideTypeSelection={true}
        hideStudyObjectSelection={true}
        forcedType={{
          typeId: typeSubtypeIds.typeId,
          subtypeId: typeSubtypeIds.subtypeId,
        }}
        prefilledAiData={transformSequenceDataForAi()}
        disableNavigation={true}
      />
    );
  };

  if (isPage) {
    return renderContent();
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        Générer le bilan de la séquence
        <IconButton onClick={onClose} sx={{ position: 'absolute', right: 8, top: 8 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        {alert && <Alert severity={alert.type} sx={{ mb: 2 }}>{alert.message}</Alert>}
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
};

export default SequenceSummaryResourceGenerator;
