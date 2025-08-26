import React from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  IconButton,
  Checkbox,
  Link,
  Tooltip,
  Divider,
  List,
  ListItemButton,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { API_BASE_URL } from '../../services/api';
const buildPreviewUrl = (url) => {
  if (!url) return url;
  const u = typeof url === 'string' ? url : String(url);
  // Si déjà absolu (http/https) ou data URI, ne pas modifier
  if (/^(https?:|data:)/i.test(u)) return u;
  // Si commence par '/', préfixer par la base API
  if (u.startsWith('/')) return `${API_BASE_URL}${u}`;
  // Sinon, concaténer proprement
  return `${API_BASE_URL}/${u.replace(/^\/+/,'')}`;
};

const MergeStep = ({
  resourcesToMerge,
  currentMergeIndex,
  finalMergedResources,
  isMerging,
  htmlMergeError,
  mergedHtmlPreview,
  handlePrevStep,
  handleSaveResources,
  handlePrevMergeItem,
  handleNextMergeItem,
  areAllMergesAttempted,
  handleToggleResourceConservation,
  isSavingResources,
  saveError
}) => {
  // Si aucun exercice n'est disponible pour la fusion
  if (resourcesToMerge.length === 0) {
    return (
      <Box sx={{ my: 2 }}>
        <Alert severity="warning">Aucun exercice n'a été conservé ou n'est prêt pour la fusion.</Alert>
        <Button onClick={handlePrevStep}>Précédent (Édition)</Button>
      </Box>
    );
  }

  if (!resourcesToMerge[currentMergeIndex]) {
    return (
      <Box sx={{ my: 2 }}>
        <Alert severity="error">Erreur: Index de fusion invalide.</Alert>
        <Button onClick={handlePrevStep}>Précédent (Édition)</Button>
      </Box>
    );
  }

  return (
    <Box sx={{ my: 2 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Fusion HTML avec templates
      </Typography>
      
      {/* Affichage de l'avancement global */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="body1">
          Fusion automatique des exercices avec leurs templates HTML
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {finalMergedResources.filter(r => r.mergeStatus === 'success').length} / {resourcesToMerge.length} fusionnés
        </Typography>
      </Box>

      {/* Instructions pour la sélection */}
      <Alert severity="info" sx={{ mb: 2 }}>
        Sélectionnez les exercices à conserver pour la création des ressources. Vous pouvez visualiser chaque exercice en cliquant sur l'icône d'aperçu.
      </Alert>

      {/* Liste des exercices avec leur statut de fusion et options de sélection */}
      <List sx={{ mb: 3 }}>
        {resourcesToMerge.map((resource, index) => {
          const mergeStatus = finalMergedResources[index]?.mergeStatus;
          const isConserved = finalMergedResources[index]?.conserved !== false; // Par défaut, conserver
          const htmlUrl = finalMergedResources[index]?.html_url;
          const rawHref = finalMergedResources[index]?.mergedHtml || htmlUrl;
          const previewHref = buildPreviewUrl(rawHref);
          
          return (
            <ListItemButton 
              key={index} 
              onClick={() => handleToggleResourceConservation(index)}
              disabled={mergeStatus !== 'success'}
              sx={{ 
                border: '1px solid #eee', 
                mb: 1, 
                borderRadius: '4px', 
                bgcolor: isConserved ? 'action.hover' : 'transparent',
                display: 'flex',
                alignItems: 'flex-start',
                flexDirection: 'column',
                p: 2
              }}
            >
              <Box sx={{ display: 'flex', width: '100%', alignItems: 'center' }}>
                {/* Checkbox pour conserver/supprimer */}
                <Checkbox 
                  checked={isConserved}
                  onChange={() => handleToggleResourceConservation(index)}
                  disabled={mergeStatus !== 'success'}
                  edge="start"
                  disableRipple
                />
                
                {/* Indicateur de statut */}
                <ListItemIcon sx={{ minWidth: 40 }}>
                  {isMerging && index === currentMergeIndex && <CircularProgress size={24} />}
                  {mergeStatus === 'success' && <CheckCircleIcon color="success" />}
                  {mergeStatus === 'error' && <ErrorIcon color="error" />}
                  {!mergeStatus && index !== currentMergeIndex && <HourglassEmptyIcon color="disabled" />}
                </ListItemIcon>
                
                {/* Informations sur l'exercice */}
                <ListItemText
                  primary={`${resource.suggestion.type_key} - ${resource.suggestion.subtype_key}`}
                  secondary={
                    <>
                      {mergeStatus === 'error' && (
                        <Typography variant="caption" color="error.main">
                          {finalMergedResources[index]?.error || "Erreur lors de la fusion"}
                        </Typography>
                      )}
                      {mergeStatus === 'success' && (
                        <Typography variant="caption" color="text.secondary">
                          Template: {finalMergedResources[index]?.template_path || "Template automatique"}
                        </Typography>
                      )}
                    </>
                  }
                />
              </Box>
              
              {/* Bouton de visualisation pour les exercices fusionnés avec succès */}
              {mergeStatus === 'success' && 
               (finalMergedResources[index]?.mergedHtml || finalMergedResources[index]?.html_url) && (
                <Button
                  variant="outlined"
                  size="small"
                  color="primary"
                  startIcon={<OpenInNewIcon />}
                  href={previewHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ mt: 1, alignSelf: 'flex-end' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  Visualiser le document HTML
                </Button>
              )}
            </ListItemButton>
          );
        })}
      </List>

      {/* Message d'erreur global si présent */}
      {htmlMergeError && <Alert severity="error" sx={{ my: 2 }}>{htmlMergeError}</Alert>}

      {/* Message d'erreur de sauvegarde si présent */}
      {saveError && <Alert severity="error" sx={{ my: 2 }}>{saveError}</Alert>}

      {/* Boutons de navigation */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
        <Button onClick={handlePrevStep} disabled={isMerging || isSavingResources}>
          Précédent (Édition)
        </Button>
        <Button 
          variant="contained" 
          color="success"
          onClick={() => {
            // Récupérer les ressources prêtes à sauvegarder et les passer au gestionnaire
            const resourcesToSave = finalMergedResources.filter(r => 
              r.mergeStatus === 'success' && 
              r.conserved !== false
            );
            console.log("[MergeStep] Ressources à sauvegarder:", resourcesToSave);
            handleSaveResources(resourcesToSave);
          }} 
          disabled={isMerging || isSavingResources || !areAllMergesAttempted() || finalMergedResources.filter(r => r.mergeStatus === 'success' && r.conserved !== false).length === 0}
          startIcon={isSavingResources ? <CircularProgress size={20} color="inherit" /> : null}
        >
          {isSavingResources ? 'Enregistrement en cours...' : 'Enregistrer les ressources'}
        </Button>
      </Box>
    </Box>
  );
};

MergeStep.propTypes = {
  resourcesToMerge: PropTypes.array.isRequired,
  currentMergeIndex: PropTypes.number.isRequired,
  finalMergedResources: PropTypes.array.isRequired,
  isMerging: PropTypes.bool.isRequired,
  htmlMergeError: PropTypes.string,
  mergedHtmlPreview: PropTypes.string,
  handlePrevStep: PropTypes.func.isRequired,
  handleSaveResources: PropTypes.func.isRequired,
  handlePrevMergeItem: PropTypes.func.isRequired,
  handleNextMergeItem: PropTypes.func.isRequired,
  areAllMergesAttempted: PropTypes.func.isRequired,
  handleToggleResourceConservation: PropTypes.func.isRequired,
  isSavingResources: PropTypes.bool,
  saveError: PropTypes.string
};

export default MergeStep;
