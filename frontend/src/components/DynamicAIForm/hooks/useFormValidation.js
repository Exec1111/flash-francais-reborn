import { useState } from 'react';

/**
 * Hook personnalisé pour gérer la validation du formulaire
 * 
 * @param {Object} formData - Données du formulaire à valider
 * @param {Object} formSchema - Schéma du formulaire contenant les règles de validation
 * @returns {Object} État et fonctions liés à la validation du formulaire
 */
const useFormValidation = (formData, formSchema) => {
  const [errors, setErrors] = useState({});

  /**
   * Vérifie si un champ est de type liste
   * 
   * @param {Object} field - Description du champ à vérifier
   * @returns {boolean} Vrai si le champ est une liste
   */
  const isListField = (field) => {
    return field.type === 'array' || field.type === 'list';
  };

  /**
   * Valide le formulaire complet selon le schéma
   * 
   * @returns {boolean} Vrai si le formulaire est valide
   */
  const validateForm = () => {
    const newErrors = {};
    let isValid = true;
    
    if (!formSchema || !formSchema.fields) {
      return true; // Pas de validation possible sans schéma
    }

    const isPdfMode = formData?.sourceMode === 'pdf_resource' || formData?.sourceMode === 'pdf_file';
    
    formSchema.fields.forEach(field => {
      // Vérification des champs requis
      if (field.required && 
          (formData[field.name] === undefined || 
           formData[field.name] === null || 
           formData[field.name] === '')) {
        // En mode PDF, ignorer la contrainte requise sur le champ texte_source
        if (isPdfMode && field.name === 'texte_source') {
          // ne rien faire
        } else {
          newErrors[field.name] = `Le champ ${field.label || field.name} est requis`;
          isValid = false;
        }
      }
      
      // Validations spécifiques selon le type
      if (formData[field.name] !== undefined && formData[field.name] !== null) {
        // Validation des nombres
        if (field.type === 'number' || field.type === 'integer') {
          const numberValue = Number(formData[field.name]);
          if (isNaN(numberValue)) {
            newErrors[field.name] = `Le champ ${field.label || field.name} doit être un nombre`;
            isValid = false;
          }
          
          // Validation min/max pour les nombres
          if (field.validations) {
            if (field.validations.min !== undefined && numberValue < field.validations.min) {
              newErrors[field.name] = `La valeur minimale pour ${field.label || field.name} est ${field.validations.min}`;
              isValid = false;
            }
            if (field.validations.max !== undefined && numberValue > field.validations.max) {
              newErrors[field.name] = `La valeur maximale pour ${field.label || field.name} est ${field.validations.max}`;
              isValid = false;
            }
          }
        }
        
        // Validation des listes
        if (isListField(field) && Array.isArray(formData[field.name])) {
          if (field.validations && field.validations.minItems !== undefined && 
              formData[field.name].length < field.validations.minItems) {
            newErrors[field.name] = `Vous devez sélectionner au moins ${field.validations.minItems} éléments`;
            isValid = false;
          }
        }
        
        // Validation enum (valeurs autorisées)
        if (field.enum && formData[field.name] !== "" && 
            !field.enum.includes(formData[field.name])) {
          newErrors[field.name] = `Valeur non autorisée pour ${field.label || field.name}`;
          isValid = false;
        }
      }
    });

    // Validations spécifiques au mode PDF (champs UI hors schéma)
    if (isPdfMode) {
      if (formData.sourceMode === 'pdf_resource') {
        if (!formData.pdfResourceId) {
          newErrors.pdfResourceId = `Veuillez sélectionner une ressource PDF`;
          isValid = false;
        }
      }
      if (formData.sourceMode === 'pdf_file') {
        if (!formData.pdfFile) {
          newErrors.pdfFile = `Veuillez sélectionner un fichier PDF`;
          isValid = false;
        } else if (formData.pdfFile && formData.pdfFile.type && formData.pdfFile.type !== 'application/pdf') {
          newErrors.pdfFile = `Le fichier sélectionné doit être un PDF`;
          isValid = false;
        }
      }
    }
    
    setErrors(newErrors);
    return isValid;
  };

  return { errors, setErrors, validateForm, isListField };
};

export default useFormValidation;
