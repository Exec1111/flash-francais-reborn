import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  CircularProgress,
  Typography,
  Box,
  Alert
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ResourceForm from '../resources/ResourceForm';
import sessionService from '../../services/sessionService';
import { resourceTypeService } from '../../services/resourceTypeService';

/**
 * Générateur de fiche de séance (resource type: seance / summary).
 * - Ouvre un formulaire ResourceForm pré-rempli
 * - À la création, attache automatiquement la ressource comme fiche de séance
 */
const SessionSummaryResourceGenerator = ({
  sessionId,
  open,
  onClose,
  onSuccess,
  isPage = false,
}) => {
  const navigate = useNavigate();
  const [sessionData, setSessionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [alert, setAlert] = useState(null);
  const [resourceTypeIds, setResourceTypeIds] = useState({ typeId: '', subtypeId: '' });

  /* Récupération de l'identifiant type/subtype seance/summary */
  useEffect(() => {
    const fetchTypes = async () => {
      // S'assurer que le spinner n'est pas bloquant indéfiniment
      setLoading(true);
      try {
        const types = await resourceTypeService.getAllTypes();
        const seanceType = types.find((t) => t.key.toLowerCase() === 'seance');
        if (!seanceType) {
          setError('Type "seance" introuvable');
          setLoading(false);
          return;
        }
        const subtypes = await resourceTypeService.getSubtypesByType(seanceType.id);
        const summarySubtype = subtypes.find((st) => st.key.toLowerCase() === 'summary');
        if (!summarySubtype) {
          setError('Sous-type "summary" introuvable');
          setLoading(false); // Ajout gestion loading
          return;
        }
        setResourceTypeIds({ typeId: seanceType.id, subtypeId: summarySubtype.id });
      } catch (e) {
        setError('Impossible de charger les types de ressources');
        setLoading(false); // Ajout gestion loading
      } finally {
        setLoading(false); // Ajout gestion loading
      }
    };
    fetchTypes();
  }, []);

  /* Récupération des données de séance */
  useEffect(() => {
    const fetchSession = async () => {
      if (!sessionId || !resourceTypeIds.typeId) return;
      if (!isPage && !open) return;
      try {
        setLoading(true);
        const data = await sessionService.getSessionById(sessionId);
        setSessionData(data);
      } catch (e) {
        setError("Impossible de charger les données de la séance");
      } finally {
        setLoading(false);
      }
    };
    fetchSession();
  }, [sessionId, open, isPage, resourceTypeIds]);

  /* Helpers */
  const prepareInitialData = () => {
    if (!sessionData) return null;
    return {
      title: `Fiche – ${sessionData.title}`,
      description: `Préparation complète pour la séance \"${sessionData.title}\"`,
    };
  };

  const transformSessionDataForAi = () => {
    if (!sessionData) return null;

    const dummyPhase = {
      nom: 'Séance',
      duree: 60,
      objectif: sessionData.objectives?.[0]?.description || '',
      activites: sessionData.notes || '',
      modalites: '',
    };

    return {
      titre_sequence: sessionData.sequence_title || '',
      titre_seance: sessionData.title,
      niveau: sessionData.level || 'B1',
      duree: 60,
      objectifs: (sessionData.objectives || []).map((o) => o.description),
      ressources: (sessionData.resources || []).map((r) => ({
        titre: r.title,
        type: r.resource_type?.name || '',
      })),
      phases: sessionData.phases || [dummyPhase],
      evaluation: sessionData.evaluation || '',
      differentiation: sessionData.differentiation || '',
      devoirs: sessionData.homework || '',
    };
  };

  const handleFormSuccess = async (createdResource) => {
    const id = typeof createdResource === 'object' ? createdResource.id : createdResource;
    if (!id) {
      setAlert({ type: 'error', message: 'Création de la ressource échouée.' });
      return;
    }
    try {
      // Dans ce flux, on ne met PAS à jour fiche_resource_id automatisch.
      setAlert({
        type: 'success',
        message: 'Ressource de fiche générée. Vous pourrez l’attacher comme fiche depuis la page de séance.'
      });
      if (onSuccess) onSuccess();
      else if (isPage) navigate(`/sessions/${sessionId}`);
    } catch (e) {
      setAlert({ type: 'error', message: 'Une erreur est survenue après la création de la ressource.' });
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
          <Typography sx={{ ml: 2 }}>Chargement…</Typography>
        </Box>
      );
    }
    if (error) return <Typography color="error" sx={{ p: 2 }}>{error}</Typography>;

    return (
      <ResourceForm
        open={isPage ? true : open}
        onClose={isPage ? () => window.history.back() : onClose}
        initialData={prepareInitialData()}
        isDialog={!isPage}
        onSuccess={handleFormSuccess}
        isEdit={false}
        disableSourceSelection
        hideTypeSelection
        hideStudyObjectSelection
        forcedType={{ typeId: resourceTypeIds.typeId, subtypeId: resourceTypeIds.subtypeId }}
        prefilledAiData={transformSessionDataForAi()}
        disableNavigation
      />
    );
  };

  if (isPage) return renderContent();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        Générer la fiche de séance
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

export default SessionSummaryResourceGenerator;
