import React from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Typography,
  Button,
  Alert,
  Card,
  FormControlLabel,
  Checkbox,
  IconButton
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ResourceEditorForm from '../ResourceEditorForm';

// Fonction utilitaire pour analyser le JSON de manière sécurisée
const parseJsonSafely = (jsonString) => {
  if (!jsonString) return {};
  try {
    const parsed = JSON.parse(jsonString);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (error) {
    console.error("Erreur lors de l'analyse JSON:", error);
    return {};
  }
};

const EditStep = ({
  resourcesToEdit,
  editedResources,
  currentEditIndex,
  handleResourceEditChange,
  handleToggleConserveResource,
  handlePrevStep,
  handleNextStep,
  handlePrevEditItem,
  handleNextEditItem
}) => {
  // Si aucun exercice n'est disponible pour l'édition ou si l'état n'est pas encore prêt
  if (resourcesToEdit.length === 0 || editedResources.length === 0 || !editedResources[currentEditIndex]) {
    return (
      <Box sx={{ my: 2 }}>
        <Alert severity="warning">Aucun exercice n'a été généré avec succès ou prêt pour l'édition.</Alert>
        <Button onClick={handlePrevStep}>Précédent (Génération)</Button>
      </Box>
    );
  }

  return (
    <Box sx={{ my: 2 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Étape 3: Édition des exercices générés ({currentEditIndex + 1} / {resourcesToEdit.length})
      </Typography>
      
      <Card variant="outlined" sx={{ mb: 2, p: 2 }}>
        <Typography variant="subtitle1" gutterBottom>
          Exercice: {editedResources[currentEditIndex].suggestion.type_key}/{editedResources[currentEditIndex].suggestion.subtype_key}
        </Typography>
        
        <ResourceEditorForm
          initialData={parseJsonSafely(editedResources[currentEditIndex].editedData)}
          onChange={(updatedData) => {
            // Convertir l'objet mis à jour en JSON pour le stockage
            handleResourceEditChange(currentEditIndex, JSON.stringify(updatedData, null, 2));
          }}
          hideButtons={true} // Ne pas afficher les boutons du formulaire car nous avons nos propres boutons de navigation
        />
        
        <FormControlLabel
          control={
            <Checkbox 
              checked={editedResources[currentEditIndex].conserved} 
              onChange={() => handleToggleConserveResource(currentEditIndex)} 
            />
          }
          label="Conserver cet exercice pour la fusion"
        />
      </Card>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3, alignItems: 'center' }}>
        <Button onClick={handlePrevStep}>
          Précédent (Génération)
        </Button>
        
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton onClick={handlePrevEditItem} disabled={currentEditIndex === 0}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="body2" sx={{ mx: 1 }}>
            {currentEditIndex + 1} / {resourcesToEdit.length}
          </Typography>
          <IconButton onClick={handleNextEditItem} disabled={currentEditIndex === resourcesToEdit.length - 1}>
            <ArrowForwardIcon />
          </IconButton>
        </Box>

        <Button variant="contained" onClick={handleNextStep}>
          Suivant (Fusion HTML)
        </Button>
      </Box>
    </Box>
  );
};

EditStep.propTypes = {
  resourcesToEdit: PropTypes.array.isRequired,
  editedResources: PropTypes.array.isRequired,
  currentEditIndex: PropTypes.number.isRequired,
  handleResourceEditChange: PropTypes.func.isRequired,
  handleToggleConserveResource: PropTypes.func.isRequired,
  handlePrevStep: PropTypes.func.isRequired,
  handleNextStep: PropTypes.func.isRequired,
  handlePrevEditItem: PropTypes.func.isRequired,
  handleNextEditItem: PropTypes.func.isRequired
};

export default EditStep;
