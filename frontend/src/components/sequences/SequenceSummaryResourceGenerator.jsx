import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, 
         CircularProgress, Typography, IconButton, Box } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ResourceForm from '../resources/ResourceForm';
import sequenceService from '../../services/sequenceService';
import { resourceTypeService } from '../../services/resourceTypeService';

/**
 * Composant pour générer un résumé de séquence pédagogique
 * Ce composant récupère les données d'une séquence et ses objets associés,
 * puis les utilise pour pré-remplir le formulaire de génération de ressource IA.
 * 
 * @param {Object} props - Propriétés du composant
 * @param {string} props.sequenceId - ID de la séquence à résumer
 * @param {boolean} props.open - (Mode modal uniquement) Indique si le dialogue est ouvert
 * @param {Function} props.onClose - (Mode modal uniquement) Fonction appelée à la fermeture
 * @param {Function} props.onSuccess - Fonction appelée après la création réussie de la ressource
 * @param {boolean} props.isPage - Indique si le composant est utilisé en mode page complète
 */
const SequenceSummaryResourceGenerator = ({ 
  sequenceId, 
  open, 
  onClose, 
  onSuccess,
  isPage = false
}) => {
  // États
  const [sequenceData, setSequenceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [resourceTypes, setResourceTypes] = useState([]);
  const [typeSubtypeIds, setTypeSubtypeIds] = useState({ typeId: '', subtypeId: '' });
  
  // Ajout de logs d'initialisation
  useEffect(() => {
    console.log('[DEBUG] SequenceSummaryResourceGenerator - Initialisation avec params:', {
      sequenceId, open, isPage
    });
  }, []);

  // Charger les types et sous-types de ressources immédiatement à l'initialisation
  useEffect(() => {
    const fetchResourceTypes = async () => {
      try {
        console.log('[DEBUG] Début chargement des types de ressources, mode page =', isPage);
        setLoading(true);
        const types = await resourceTypeService.getAllTypes();
        console.log('[DEBUG] Types de ressources reçus:', types);
        setResourceTypes(types);
        
        // Trouver l'ID du type "lecon" et du sous-type "sequence_summary" (insensible à la casse)
        const lessonType = types.find(type => type.key.toLowerCase() === 'lecon');
        if (lessonType) {
          console.log('[DEBUG] Type de ressource "lecon" trouvé:', lessonType);
          const subtypes = await resourceTypeService.getSubtypesByType(lessonType.id);
          console.log('[DEBUG] Sous-types récupérés:', subtypes);
          const summarySubtype = subtypes.find(subtype => subtype.key.toLowerCase() === 'sequence_summary');
          
          if (lessonType && summarySubtype) {
            console.log('[DEBUG] Types et sous-types trouvés, prêt à charger les données de séquence');
            setTypeSubtypeIds({
              typeId: lessonType.id,
              subtypeId: summarySubtype.id
            });
          } else {
            console.error('[ERREUR] Sous-type "sequence_summary" non trouvé');
            setError('Type ou sous-type de ressource pour résumé de séquence non trouvé');
            setLoading(false);
          }
        } else {
          console.error('[ERREUR] Type de ressource "leçon" non trouvé');
          setError('Type de ressource "leçon" non trouvé');
          setLoading(false);
        }
      } catch (err) {
        console.error('[ERREUR] Chargement des types de ressources:', err);
        setError('Impossible de charger les types de ressources');
        setLoading(false);
      }
    };
    
    // On charge toujours les types de ressources au démarrage
    fetchResourceTypes();
  }, []);

  // Chargement des données complètes de la séquence avec séances
  useEffect(() => {
    const fetchSequenceData = async () => {
      try {
        console.log('[DEBUG] Tentative de chargement des données de séquence', {
          sequenceId,
          typeIds: typeSubtypeIds,
          isPage,
          open
        });

        if (!sequenceId) {
          console.error('[ERREUR] ID de séquence manquant');
          setError('ID de séquence non spécifié');
          setLoading(false);
          return;
        }

        setLoading(true);
        // Étape 1 : Récupérer les données de base de la séquence avec objectifs et objets d'étude
        const sequenceData = await sequenceService.getSequenceWithObjects(sequenceId);
        console.log('[DEBUG] Données de base de séquence récupérées:', sequenceData);
        
        // Étape 2 : Récupérer les séances associées à la séquence
        try {
          const sessionsData = await sequenceService.getSequenceSessions(sequenceId);
          console.log('[DEBUG] Séances de la séquence récupérées:', sessionsData);
          console.log('[DEBUG] Nombre de séances récupérées:', sessionsData ? sessionsData.length : 0);
          if (sessionsData && sessionsData.length > 0) {
            console.log('[DEBUG] Première séance:', JSON.stringify(sessionsData[0], null, 2));
          } else {
            console.log('[DEBUG] Aucune séance trouvée pour cette séquence');
          }
          // Ajouter les séances aux données de la séquence
          sequenceData.sessions = sessionsData;
        } catch (sessionErr) {
          console.warn('[AVERTISSEMENT] Impossible de récupérer les séances:', sessionErr);
          sequenceData.sessions = [];
        }
        
        setSequenceData(sequenceData);
        setLoading(false);
      } catch (err) {
        console.error('[ERREUR] Chargement des données de séquence:', err);
        setError('Impossible de charger les données de la séquence');
        setLoading(false);
      }
    };
    
    // En mode page (isPage=true), on charge toujours les données quand l'ID de type est disponible
    // En mode modal (isPage=false), on vérifie aussi que le modal est ouvert
    if (sequenceId && typeSubtypeIds.typeId && typeSubtypeIds.subtypeId) {
      if (isPage || open) {
        console.log('[DEBUG] Conditions remplies pour charger les données de séquence');
        fetchSequenceData();
      } else {
        console.log('[DEBUG] En attente d\'ouverture du modal pour charger les données');
      }
    } else {
      console.log('[DEBUG] En attente des IDs de type/sous-type ou de l\'ID de séquence');
    }
  }, [sequenceId, open, typeSubtypeIds, isPage]);
  
  // Préparer les données pour le formulaire ResourceForm selon le format attendu par le prompt
  const prepareInitialData = () => {
    if (!sequenceData || !typeSubtypeIds.typeId || !typeSubtypeIds.subtypeId) return null;
    
    console.log('[DEBUG] Préparation des données de la séquence pour l\'IA:', sequenceData);
    
    // Structurer les données selon le format attendu par le prompt mis à jour
    // Déboguer les données reçues
    console.log('[DEBUG] Données de la séquence avant formatage:', {
      objectifs: sequenceData.objectives,
      sessions: sequenceData.sessions,
      resources: sequenceData.resources
    });
    
    // Préparation des objectifs avec le bon format
    const formattedObjectives = (sequenceData.objectives || []).map(obj => ({
      id: obj.id,
      description: obj.description || obj.title || "Objectif sans description"
    }));
    
    // Préparation des objets d'étude avec le bon format
    const formattedStudyObjects = (sequenceData.study_objects || []).map(obj => ({
      id: obj.id,
      title: obj.title || "Objet d'étude sans titre",
      description: obj.description || ""
    }));
    
    // Préparation des séances avec leurs ressources
    const formattedSessions = (sequenceData.sessions || []).map(session => ({
      id: session.id,
      title: session.title || "Séance sans titre",
      description: session.description || "",
      notes: session.notes || "",
      date: session.date || "",
      duration: session.duration || 0,
      // Ajouter un tableau vide de ressources pour chaque séance pour l'instant
      resources: []
    }));
    
    // Préparation des ressources globales avec format enrichi
    const formattedResources = (sequenceData.resources || []).map(resource => ({
      id: resource.id,
      title: resource.title || "Ressource sans titre",
      description: resource.description || "",
      content: resource.content || "",
      type_name: resource.type?.name || 'Non spécifié',
      sub_type_name: resource.sub_type?.name || 'Non spécifié'
    }));
    
    // Log des données formatées
    console.log('[DEBUG] Données formatées pour l\'IA:', {
      objectifs: formattedObjectives,
      study_objects: formattedStudyObjects,
      sessions: formattedSessions,
      ressources: formattedResources
    });
    
    return {
      title: `Résumé - ${sequenceData.title}`,
      resource_type_id: typeSubtypeIds.typeId,
      resource_sub_type_id: typeSubtypeIds.subtypeId,
      description: `Document de révision complet pour la séquence "${sequenceData.title}"`,
      content: '',
      metadata: JSON.stringify({
        // Variables pour le prompt - sans imbrication
        titre_sequence: sequenceData.title,
        description: sequenceData.description || '',
        // Format spécial pour les objectifs - transformation en tableau simple
        objectifs: formattedObjectives.map(obj => ({
          description: obj.description || 'Objectif sans description'
        })),
        // Format spécial pour les objets d'étude - s'assurer que chaque objet a un titre
        study_objects: formattedStudyObjects.map(obj => ({
          title: obj.title,
          description: obj.description || ''
        })),
        // Format spécial pour les séances - s'assurer que chaque séance a un titre
        sessions: formattedSessions.map(session => ({
          title: session.title,
          description: session.description || '',
          notes: session.notes || '',
          resources: [] // Tableau vide par défaut
        })),
        // Format spécial pour les ressources - s'assurer que chaque ressource a un titre
        ressources: formattedResources.map(resource => ({
          title: resource.title || 'Ressource sans titre',
          type_name: resource.type_name,
          sub_type_name: resource.sub_type_name,
          description: resource.description || '',
          content: resource.content || ''
        }))
      })
    };
  };
  
  // Transformer les données de la séquence pour DynamicAIForm
  const transformSequenceDataForAi = () => {
    if (!sequenceData) return null;
    
    return {
      titre_sequence: sequenceData.title,
      niveau: sequenceData.level || 'B1', // Valeur par défaut si non définie
      objectifs: sequenceData.objectives.map(obj => ({
        description: obj.description
      })),
      ressources: sequenceData.resources.map(res => ({
        titre: res.title,
        type: res.resource_type ? res.resource_type.name : 'Non spécifié'
      }))
    };
  };
  
  // Log de l'état du composant pour le débogage
  console.log('[DEBUG] État du composant:', {
    loading, 
    error, 
    sequenceData, 
    resourceTypes: resourceTypes?.length || 0,
    typeSubtypeIds
  });

  // Si chargement en cours, afficher un indicateur
  if (loading) {
    console.log('[DEBUG] Affichage indicateur de chargement, mode page =', isPage);
    if (isPage) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
          <Typography variant="body2" sx={{ ml: 2 }}>Chargement des données...</Typography>
        </Box>
      );
    } else {
      return (
        <Dialog open={open} maxWidth="md" fullWidth>
          <DialogTitle>Génération de résumé de séquence</DialogTitle>
          <DialogContent style={{ display: 'flex', justifyContent: 'center', padding: '30px' }}>
            <CircularProgress />
            <Typography variant="body2" sx={{ ml: 2 }}>Chargement des données...</Typography>
          </DialogContent>
        </Dialog>
      );
    }
  }
  
  // Si erreur, afficher un message
  if (error) {
    if (isPage) {
      return (
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" color="error">Erreur</Typography>
          <Typography color="error">{error}</Typography>
          <Button
            variant="outlined"
            color="primary"
            onClick={() => window.history.back()}
            sx={{ mt: 2 }}
          >
            Retour
          </Button>
        </Box>
      );
    } else {
      return (
        <Dialog open={open} maxWidth="md" fullWidth>
          <DialogTitle>
            Erreur
            <IconButton
              aria-label="close"
              onClick={onClose}
              sx={{ position: 'absolute', right: 8, top: 8 }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            <Typography color="error">{error}</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={onClose}>Fermer</Button>
          </DialogActions>
        </Dialog>
      );
    }
  }
  
  // Rendre le formulaire de ressource avec les données pré-remplies
  return (
    <ResourceForm
      open={isPage ? true : open}
      onClose={isPage ? () => window.history.back() : onClose}
      initialData={prepareInitialData()}
      isDialog={!isPage}
      onSuccess={onSuccess}
      isEdit={false}
      disableSourceSelection={true}
      // Masquer les champs qui ne doivent pas être proposés pour un résumé de séquence
      hideTypeSelection={true}          // Masquer la sélection du type/sous-type
      hideStudyObjectSelection={true}   // Masquer la sélection des objets d'étude
      forcedType={{                     // Forcer le type à LECON/SEQUENCE_SUMMARY
        typeId: typeSubtypeIds.typeId,
        subtypeId: typeSubtypeIds.subtypeId,
        typeName: 'Leçon',
        subtypeName: 'Résumé de séquence'
      }}
      prefilledAiData={transformSequenceDataForAi()}
    />
  );
};

export default SequenceSummaryResourceGenerator;
