import React, { useState } from 'react';
import { Box, Typography, Button, CircularProgress, Alert } from '@mui/material';
import FormField from './FormField';
import { RadioGroup, FormControlLabel, Radio, Switch, Divider, Stack } from '@mui/material';
import ResourceSelectorModal from '../../resources/ResourceSelectorModal';

/**
 * Composant pour l'étape de configuration du formulaire
 * 
 * @param {Object} props - Propriétés du composant
 * @param {Object} props.formSchema - Schéma du formulaire
 * @param {Object} props.formData - Données actuelles du formulaire
 * @param {Function} props.setFormData - Fonction pour mettre à jour les données du formulaire
 * @param {Object} props.errors - Erreurs de validation
 * @param {boolean} props.isLoading - Indicateur de chargement
 * @param {string} props.error - Message d'erreur global
 * @param {Function} props.onNext - Fonction pour passer à l'étape suivante
 * @param {Function} props.validateForm - Fonction pour valider le formulaire
 * @returns {JSX.Element} Composant React
 */
const ConfigurationStep = ({
  formSchema,
  formData,
  setFormData,
  errors,
  isLoading,
  error,
  onNext,
  validateForm
}) => {
  // État pour stocker les erreurs de validation locales
  const [localErrors, setLocalErrors] = useState({});
  const [showValidationError, setShowValidationError] = useState(false);
  // Modal sélection de ressource
  const [resourceModalOpen, setResourceModalOpen] = useState(false);
  // Fonction pour mettre à jour un champ du formulaire
  const handleFieldChange = (fieldName, value) => {
    setFormData({
      ...formData,
      [fieldName]: value
    });
  };
  // Déterminer si on est en mode PDF
  const isPDFMode = formData?.sourceMode === 'pdf_resource' || formData?.sourceMode === 'pdf_file';
  
  // Gérer le clic sur le bouton suivant avec validation
  const handleNextClick = () => {
    // Vérifier si la fonction de validation existe
    if (typeof validateForm === 'function') {
      // Valider le formulaire
      const isValid = validateForm();
      
      if (isValid) {
        // Si tout est valide, passer à l'étape suivante
        onNext();
      } else {
        // Sinon, afficher un message d'erreur
        setShowValidationError(true);
        // Masquer le message après quelques secondes
        setTimeout(() => setShowValidationError(false), 5000);
      }
    } else {
      // Si pas de fonction de validation, passer directement à l'étape suivante
      onNext();
    }
  };

  // Si le schéma est en cours de chargement
  if (!formSchema && isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4, mb: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  // Si le schéma n'est pas disponible et n'est pas en cours de chargement
  if (!formSchema && !isLoading) {
    return (
      <Box sx={{ mt: 2, mb: 2 }}>
        <Alert severity="warning">
          Le schéma du formulaire n'est pas disponible. Veuillez réessayer ou contacter l'administrateur.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Configuration de la génération
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {showValidationError && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Veuillez remplir tous les champs obligatoires avant de continuer.
        </Alert>
      )}
      
      {formSchema.description && (
        <Typography variant="body2" color="textSecondary" paragraph>
          {formSchema.description}
        </Typography>
      )}
      
      <Box component="form" noValidate>
        {/* Sélecteur de source pour Analyse de texte */}
        <Box sx={{ mb: 2, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>Source de la ressource</Typography>
          <RadioGroup
            row
            value={formData.sourceMode || 'texte'}
            onChange={(e) => setFormData({ ...formData, sourceMode: e.target.value })}
          >
            <FormControlLabel value="texte" control={<Radio />} label="Texte saisi" />
            <FormControlLabel value="pdf_resource" control={<Radio />} label="Ressource PDF" />
            <FormControlLabel value="pdf_file" control={<Radio />} label="Fichier PDF" />
          </RadioGroup>

          {/* Options spécifiques PDF */}
          {(formData.sourceMode === 'pdf_resource' || formData.sourceMode === 'pdf_file') && (
            <Stack spacing={2} sx={{ mt: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={Boolean(formData.ocr)}
                    onChange={(e) => setFormData({ ...formData, ocr: e.target.checked })}
                  />
                }
                label="Activer l'OCR (utile pour PDF scannés)"
              />

              {formData.sourceMode === 'pdf_resource' && (
                <Stack direction="row" spacing={2} alignItems="center">
                  <Button variant="outlined" onClick={() => setResourceModalOpen(true)} disabled={isLoading}>
                    Sélectionner une ressource
                  </Button>
                  <Typography variant="body2" color="text.secondary">
                    {formData.pdfResourceTitle ? `Sélection: ${formData.pdfResourceTitle} (id=${formData.pdfResourceId})` : 'Aucune ressource sélectionnée'}
                  </Typography>
                </Stack>
              )}

              {formData.sourceMode === 'pdf_file' && (
                <Stack direction="row" spacing={2} alignItems="center">
                  <Button variant="outlined" component="label" disabled={isLoading}>
                    Choisir un fichier PDF
                    <input
                      type="file"
                      accept="application/pdf"
                      hidden
                      onChange={(e) => {
                        const file = e.target.files && e.target.files[0];
                        if (file) {
                          setFormData({ ...formData, pdfFile: file });
                        }
                      }}
                    />
                  </Button>
                  <Typography variant="body2" color="text.secondary">
                    {formData.pdfFile ? `Fichier: ${formData.pdfFile.name}` : 'Aucun fichier sélectionné'}
                  </Typography>
                </Stack>
              )}
              <Typography variant="caption" color="text.secondary">
                {isPDFMode
                  ? "Le texte sera automatiquement extrait du PDF sélectionné. Le champ 'texte_source' est ignoré."
                  : "Vous pouvez coller ici le texte à analyser si vous n'utilisez pas de PDF."}
              </Typography>
            </Stack>
          )}
        </Box>

        {/* Champs dynamiques issus du schéma */}
        {formSchema.fields && formSchema.fields
          .filter((field) => !(isPDFMode && field.name === 'texte_source'))
          .map((field) => (
            <FormField
              key={field.name}
              field={field}
              value={formData[field.name]}
              onChange={(value) => handleFieldChange(field.name, value)}
              error={errors && errors[field.name]}
              disabled={isLoading}
            />
          ))}
        
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleNextClick}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <CircularProgress size={24} sx={{ mr: 1 }} />
                Chargement...
              </>
            ) : (
              'Suivant'
            )}
          </Button>
        </Box>
      </Box>

      {/* Modal de sélection de ressource */}
      <ResourceSelectorModal
        open={resourceModalOpen}
        onClose={() => setResourceModalOpen(false)}
        initialSelectedResources={[]}
        onSave={(resources) => {
          const first = Array.isArray(resources) && resources.length > 0 ? resources[0] : null;
          setFormData({
            ...formData,
            pdfResourceId: first ? first.id : undefined,
            pdfResourceTitle: first ? first.title : undefined,
          });
        }}
        // On peut ajouter un filtre de type plus tard si nécessaire
      />
    </Box>
  );
};

export default ConfigurationStep;
