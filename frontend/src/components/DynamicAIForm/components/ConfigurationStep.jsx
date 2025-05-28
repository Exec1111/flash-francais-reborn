import React, { useState } from 'react';
import { Box, Typography, Button, CircularProgress, Alert } from '@mui/material';
import FormField from './FormField';

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
  // Fonction pour mettre à jour un champ du formulaire
  const handleFieldChange = (fieldName, value) => {
    setFormData({
      ...formData,
      [fieldName]: value
    });
  };
  
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
        {formSchema.fields && formSchema.fields.map((field) => (
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
    </Box>
  );
};

export default ConfigurationStep;
