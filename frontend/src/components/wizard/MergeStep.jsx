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
  Divider
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import VisibilityIcon from '@mui/icons-material/Visibility';

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
        Étape 4: Fusion HTML avec templates
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
      <Box sx={{ mb: 3 }}>
        {resourcesToMerge.map((resource, index) => {
          const mergeStatus = finalMergedResources[index]?.mergeStatus;
          const isConserved = finalMergedResources[index]?.conserved !== false; // Par défaut, conserver
          const htmlUrl = finalMergedResources[index]?.html_url;
          
          return (
            <Box 
              key={index} 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                p: 1.5, 
                mb: 1, 
                border: '1px solid #eee',
                borderRadius: 1,
                bgcolor: isConserved ? 'rgba(232, 245, 233, 0.2)' : 'transparent'
              }}
            >
              {/* Checkbox pour conserver/supprimer */}
              <Checkbox 
                checked={isConserved}
                onChange={() => handleToggleResourceConservation(index)}
                disabled={mergeStatus !== 'success'}
                color="primary"
                sx={{ mr: 1 }}
              />
              
              {/* Indicateur de statut */}
              <Box sx={{ mr: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30 }}>
                {isMerging && index === currentMergeIndex && <CircularProgress size={24} />}
                {mergeStatus === 'success' && <CheckCircleIcon color="success" />}
                {mergeStatus === 'error' && <ErrorIcon color="error" />}
                {!mergeStatus && index !== currentMergeIndex && <HourglassEmptyIcon color="disabled" />}
              </Box>
              
              {/* Informations sur l'exercice */}
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="subtitle2">
                  {resource.suggestion.type_key} / {resource.suggestion.subtype_key}
                </Typography>
                {mergeStatus === 'error' && (
                  <Typography variant="caption" color="error.main">
                    {finalMergedResources[index]?.error || "Erreur lors de la fusion"}
                  </Typography>
                )}
                {mergeStatus === 'success' && (
                  <Box sx={{ mt: 0.5 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                      Template: {finalMergedResources[index]?.template_path || "Template automatique"}
                    </Typography>
                    
                    {htmlUrl && (
                      <Button
                        variant="outlined"
                        size="small"
                        color="primary"
                        startIcon={<OpenInNewIcon />}
                        href={htmlUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{ mt: 0.5 }}
                      >
                        Visualiser le document HTML
                      </Button>
                    )}
                  </Box>
                )}
              </Box>
            </Box>
          );
        })}
      </Box>

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
          onClick={handleSaveResources} 
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
