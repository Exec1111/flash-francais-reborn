import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; 
import { 
  Box, 
  TextField, 
  Typography, 
  Button, 
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Grid,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Link,
  Stepper,
  Step,
  StepLabel,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ResourceEditorForm from './ResourceEditorForm';

const createAxiosInstance = () => {
  const instance = fetch;
  
  return instance;
};

const axiosInstance = createAxiosInstance();

const DynamicAIForm = ({ typeKey, subtypeKey, onSubmit, onSuccess, onCancel, onClose, loading, typeId=1, subtypeId=1, initialTitle="", initialDescription="", selectedStudyObjects=[] }) => {
  const navigate = useNavigate();
  const [formSchema, setFormSchema] = useState(null);
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeStep, setActiveStep] = useState(0);
  const [generationResults, setGenerationResults] = useState([]);
  const [currentEditIndex, setCurrentEditIndex] = useState(0);
  const [editedResults, setEditedResults] = useState([]);
  const [mergedResults, setMergedResults] = useState(null);
  const [resourceId, setResourceId] = useState(null);
  const [htmlPreviewUrl, setHtmlPreviewUrl] = useState(null);
  const [progress, setProgress] = useState([]);
  const [generatedTitles, setGeneratedTitles] = useState([]);
  const [showAuthError, setShowAuthError] = useState(false);
  const [localHtmlContent, setLocalHtmlContent] = useState("");
  const [mergeSuccess, setMergeSuccess] = useState(false); // Nouveau état pour marquer la fusion comme réussie
  
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:10000";

  useEffect(() => {
    console.log('DEBUG [DynamicAIForm] useEffect déclenché avec typeKey:', typeKey, 'subtypeKey:', subtypeKey);
    setFormSchema(null);
    setFormData({});
    setErrors({});
    if (typeKey && subtypeKey) {
      fetchSchema();
    }
  }, [typeKey, subtypeKey]);

  const fetchSchema = async () => {
    console.log('DEBUG [DynamicAIForm] fetchSchema appelé avec typeKey:', typeKey, 'subtypeKey:', subtypeKey);
    try {
      setIsLoading(true);
      setError(null);
      const url = `${API_BASE_URL}/api/v1/ai/resource-types/${typeKey}/${subtypeKey}/schema`;
      console.log('[DEBUG][fetchSchema] URL:', url);
      
      try {
        const token = localStorage.getItem('token');
        console.log('[DEBUG][fetchSchema] Token actuel dans localStorage:', token);
        
        if (!token) {
          setError("Aucun jeton d'authentification trouvé. Veuillez vous reconnecter.");
          setShowAuthError(true);
          return;
        }
        
        const response = await axiosInstance(url, {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const schema = await response.json();
        console.log('[DEBUG][fetchSchema] Schéma reçu:', schema);
        
        const initialData = {};
        schema.fields.forEach(field => {
          if (field.default !== null && field.default !== undefined) {
            initialData[field.name] = field.default;
          }
          
          // Si c'est un QCM et que le champ est 'theme', utiliser le titre du premier objet d'étude si disponible
 if (
   field.name === 'theme' &&
   !initialData.theme &&                     // keep existing value
   selectedStudyObjects?.length
 ) {
   initialData.theme = selectedStudyObjects[0].title;
 }
        });
        
        setFormSchema(schema);
        setFormData(initialData);
      } catch (err) {
        console.error('[DEBUG][fetchSchema] Erreur:', err);
        handleApiError(err, 'Erreur lors de la récupération du schéma');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleApiError = (err, contextMessage) => {
    console.error(`[DEBUG] ${contextMessage}:`, err);
    
    if (err.response) {
      const status = err.response.status;
      
      if (status === 404) {
        setError(`Schéma non trouvé pour le type "${typeKey}" et sous-type "${subtypeKey}". Veuillez vérifier que ce type de ressource existe bien.`);
      } else if (status === 401) {
        setError("Votre session a expiré. Veuillez vous reconnecter.");
        setShowAuthError(true);
      } else {
        setError(`${contextMessage}: ${status} - ${getDetailedError(err)}`);
      }
    } else if (err.request) {
      setError(`${contextMessage}: Aucune réponse reçue du serveur. Vérifiez votre connexion.`);
    } else {
      setError(`${contextMessage}: ${err.message}`);
    }
  };

  const getDetailedError = (error) => {
    console.log('[DEBUG] Détails de l\'erreur API:', error.response?.data);
    
    if (error.response?.data?.detail && Array.isArray(error.response.data.detail)) {
      // Traitement des erreurs structurées de FastAPI
      let detailedMessage = "";
      error.response.data.detail.forEach((err, idx) => {
        console.log(`[DEBUG] Erreur ${idx + 1}:`, err);
        if (err.loc && err.loc.length > 0) {
          const fieldName = err.loc.join('.');
          detailedMessage += `Champ: ${fieldName} - ${err.msg}\n`;
        } else {
          detailedMessage += `${err.msg}\n`;
        }
      });
      return detailedMessage;
    } else if (error.response?.data?.detail) {
      return error.response.data.detail;
    } else if (error.message) {
      return error.message;
    }
    
    return "Erreur inconnue";
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    const processedValue = type === 'number' ? parseFloat(value) : value;
    setFormData({
      ...formData,
      [name]: processedValue
    });
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: null
      });
    }
  };

  const handleListChange = (name, value) => {
    // Stocker la valeur brute pour les champs de liste au lieu de la traiter immédiatement
    // Le traitement sera fait lors de la soumission du formulaire
    setFormData({
      ...formData,
      [name]: value
    });
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: null
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    let isValid = true;
    if (!formSchema) return true;
    
    // Clone des données du formulaire pour traitement
    const processedFormData = {...formData};
    
    formSchema.fields.forEach(field => {
      // Traitement spécifique pour les champs de liste
      if (isListField(field) && typeof processedFormData[field.name] === 'string') {
        processedFormData[field.name] = processedFormData[field.name]
          .split(',')
          .map(item => item.trim())
          .filter(item => item !== '');
      }
      
      if (field.required && (processedFormData[field.name] === undefined || 
                             processedFormData[field.name] === '' ||
                             (Array.isArray(processedFormData[field.name]) && processedFormData[field.name].length === 0))) {
        newErrors[field.name] = `${field.description || field.label} est obligatoire`;
        isValid = false;
      }
      
      if (field.type === 'number' && processedFormData[field.name] !== undefined) {
        if (field.validations?.min !== undefined && processedFormData[field.name] < field.validations.min) {
          newErrors[field.name] = `${field.description || field.label} doit être au moins ${field.validations.min}`;
          isValid = false;
        }
        if (field.validations?.max !== undefined && processedFormData[field.name] > field.validations.max) {
          newErrors[field.name] = `${field.label} ne peut pas dépasser ${field.validations.max}`;
          isValid = false;
        }
      }
    });
    
    setErrors(newErrors);
    return isValid;
  };

  const handleSubmitForm = (e) => {
    if (e) e.preventDefault();
    handleSubmit();
  };

  const handleSubmit = async () => {
    if (validateForm()) {
      try {
        setError(null);
        setActiveStep(1);
        
        // Traiter les champs de liste avant soumission
        const processedFormData = {...formData};
        
        if (formSchema) {
          formSchema.fields.forEach(field => {
            if (isListField(field) && typeof processedFormData[field.name] === 'string') {
              processedFormData[field.name] = processedFormData[field.name]
                .split(',')
                .map(item => item.trim())
                .filter(item => item !== '');
            }
          });
        }
        
        const requestData = { 
          type_key: typeKey, 
          subtype_key: subtypeKey, 
          variables: processedFormData 
        };
        
        const token = localStorage.getItem('token');
        
        if (!token) {
          setError("Authentification requise. Veuillez vous connecter.");
          setShowAuthError(true);
          setActiveStep(0);
          return;
        }
        
        console.log('[DEBUG] Données pour la génération:', requestData);
        console.log('[DEBUG] URL de génération:', `${API_BASE_URL}/api/v1/ai/generate-resource`);
        
        const response = await axiosInstance(`${API_BASE_URL}/api/v1/ai/generate-resource`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
          },
          body: JSON.stringify(requestData)
        });
        
        const data = await response.json();
        console.log('[DEBUG] Réponse de génération:', data);
        
        if (!data || !data.content) {
          throw new Error('Format de réponse incorrect');
        }
        
        // Traiter les résultats
        const content = data.content;
        console.log('[DEBUG] Résultats de génération:', content);
        
        // Gérer différents formats de réponse (tableau ou objet unique)
        let processedContent = [];
        let titles = [];
        
        if (Array.isArray(content)) {
          // Si content est un tableau (comme dans ProposeWorks)
          processedContent = content;
          titles = content.map(data => {
            return data.titre_oeuvre || data.chapitre || data.title || "Ressource générée";
          });
        } else {
          // Si content est un objet unique (comme pour certains exercices)
          processedContent = [content];
          titles = [content.titre || content.title || "Ressource générée"];
        }
        
        setGeneratedTitles(titles);
        setGenerationResults(processedContent);
        setEditedResults(processedContent); 
        setCurrentEditIndex(0); 
        setActiveStep(2);
        
      } catch (err) {
        setActiveStep(0); 
        handleApiError(err, 'Erreur lors de la génération');
      }
    } else {
      const firstErrorField = Object.keys(errors)[0];
      const errorElement = document.getElementById(firstErrorField);
      if (errorElement) errorElement.focus();
    }
  };

  const handleEditorChange = (index, newData) => {
    const newResults = [...editedResults];
    newResults[index] = newData;
    setEditedResults(newResults);
  };

  const handleMergeAll = async () => {
    setIsLoading(true);
    setMergeSuccess(false);
    setHtmlPreviewUrl(null);
    
    try {
      // Vérifier l'authentification
      const token = localStorage.getItem('token');
      
      if (!token) {
        setError("Authentification requise. Veuillez vous connecter.");
        setShowAuthError(true);
        setActiveStep(2);
        return;
      }

      // Vérifier si editedResults est un tableau ou un objet
      let dataToNormalize = editedResults;
      if (Array.isArray(editedResults) && editedResults.length > 0) {
        console.log('[DEBUG] editedResults est un tableau, extraction du premier élément');
        dataToNormalize = editedResults[0];
      }
      
      // Approche directe avec fetch pour éviter les problèmes Axios
      console.log('[DEBUG] Approche directe avec fetch pour éviter les problèmes Axios');
      
      // Préparation du FormData
      const formData = new FormData();
      
      // Ajouter les informations de base de la ressource
      formData.append('type_key', typeKey);
      formData.append('subtype_key', subtypeKey);
      formData.append('data_json', JSON.stringify(dataToNormalize));
      
      // Log des paramètres pour vérification
      console.log('[DEBUG] Validation des paramètres:');
      console.log(`- type_key: "${typeKey}", vide? ${!typeKey}`);
      console.log(`- subtype_key: "${subtypeKey}", vide? ${!subtypeKey}`);
      console.log(`- data_json présent? ${Boolean(JSON.stringify(dataToNormalize))}`);
      
      // Utilisation de fetch natif au lieu d'axios
      const response = await fetch(`${API_BASE_URL}/api/v1/ai/merge-resource`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          // Ne pas définir Content-Type pour laisser le navigateur le faire correctement avec le boundary
        },
        body: formData
      });
      
      // Vérifier la réponse
      if (!response.ok) {
        const errorData = await response.json();
        console.error('[DEBUG] Erreur fetch:', response.status, errorData);
        throw new Error(JSON.stringify(errorData));
      }
      
      const responseData = await response.json();
      console.log('[DEBUG] Réponse de l\'API (fetch):', responseData);
      handleSuccessfulMerge(responseData);
      return;
    } catch (err) {
      console.log('[DEBUG] Erreur détaillée de fusion:', getDetailedError(err));
      setActiveStep(2); 
      handleApiError(err, 'Erreur lors de la fusion');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuccessfulMerge = (data) => {
    // Extraire les informations importantes du formulaire d'édition
    const title = editedResults[0]?.titre || editedResults[0]?.title || "";
    const description = editedResults[0]?.description || "";
    
    console.log('[DEBUG] Données extraites du formulaire d\'édition:');
    console.log('- title/titre:', title);
    console.log('- description:', description);
    
    // Stocker les résultats fusionnés avec les données complètes
    setMergedResults({
      ...editedResults[0],  // Données du formulaire d'édition
      ...data,              // Données de l'API (comme html_url)
      titre: title,         // S'assurer que le titre est bien conservé
      title: title,         // Doublon pour compatibilité
      description: description
    });
    
    // Définir l'URL de prévisualisation HTML
    if (data && data.html_url) {
      setHtmlPreviewUrl(data.html_url);
      setMergeSuccess(true);
    }
    
    // Passage à l'étape finale
    setActiveStep(3);
  };

  const handlePrevResult = () => {
    if (currentEditIndex > 0) {
      setCurrentEditIndex(currentEditIndex - 1);
    }
  };

  const handlePrevStep = () => {
    // Revenir à l'étape précédente dans le processus
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
      
      // Si on revient de l'étape de génération (1) à la configuration (0), il faut réinitialiser certains états
      if (activeStep === 1) {
        // Pas besoin de réinitialiser quoi que ce soit ici
      }
      
      // Si on revient de l'étape de fusion (3) à l'édition (2), réinitialiser les états liés à la fusion
      if (activeStep === 3) {
        setMergeSuccess(false);
        setHtmlPreviewUrl(null);
      }
    }
  };

  // Fonction spécifique pour revenir directement à la configuration depuis l'édition
  const handleBackToConfiguration = () => {
    setActiveStep(0); // Revenir directement à l'étape 0 (configuration)
    setGenerationResults([]);
    setEditedResults([]);
  };

  const handleNextResult = () => {
    if (currentEditIndex < editedResults.length - 1) {
      setCurrentEditIndex(currentEditIndex + 1);
    }
  };

  const isListField = (field) => {
    return Array.isArray(field.default) || field.type === 'list' || field.type === 'array';
  };

  const handleCloseAuthError = () => {
    setShowAuthError(false);
  };

  const handleRedirectToLogin = () => {
    setShowAuthError(false);
    navigate('/login');
  };

  const handleFinish = async () => {
    setIsLoading(true);
    
    try {
      // Récupérer le token d'authentification
      const token = localStorage.getItem('token');
      
      if (!token) {
        setError("Authentification requise. Veuillez vous connecter.");
        setShowAuthError(true);
        setIsLoading(false);
        return;
      }

      // Vérifier que nous avons bien les résultats de fusion
      if (!mergedResults || !htmlPreviewUrl) {
        setError("Aucune ressource fusionnée disponible.");
        setIsLoading(false);
        return;
      }

      // Rechercher les informations dans le formulaire ResourceForm
      console.log('[DEBUG] Recherche des données du formulaire ResourceForm:');
      
      // Tenter plusieurs approches pour localiser les champs du formulaire
      // Approche 1: Document direct
      let formTitle = '';
      let formDescription = '';
      let titleInputs = document.querySelectorAll('input[name="title"]');
      let descriptionInputs = document.querySelectorAll('textarea[name="description"]');
      
      if (titleInputs.length > 0) {
        formTitle = titleInputs[0].value;
        console.log('[DEBUG] Titre trouvé par input[name="title"]:', formTitle);
      }
      
      if (descriptionInputs.length > 0) {
        formDescription = descriptionInputs[0].value;
        console.log('[DEBUG] Description trouvée par textarea[name="description"]:', formDescription);
      }
      
      // Approche 2: Chercher tous les inputs avec une valeur
      if (!formTitle || !formDescription) {
        console.log('[DEBUG] Recherche étendue de champs:');
        document.querySelectorAll('input, textarea').forEach(el => {
          console.log(`[DEBUG] Élément trouvé: ${el.tagName}, id=${el.id}, name=${el.name}, value=${el.value?.substring(0, 30)}${el.value?.length > 30 ? '...' : ''}`);
          
          // Si nous trouvons un champ qui ressemble à un titre
          if (!formTitle && el.value && el.id.includes('title') || el.name.includes('title')) {
            formTitle = el.value;
            console.log('[DEBUG] Titre trouvé par recherche étendue:', formTitle);
          }
          
          // Si nous trouvons un champ qui ressemble à une description
          if (!formDescription && el.value && (el.id.includes('desc') || el.name.includes('desc'))) {
            formDescription = el.value;
            console.log('[DEBUG] Description trouvée par recherche étendue:', formDescription);
          }
        });
      }
      
      // Solution temporaire: utiliser les propriétés initialTitle/initialDescription passées en props
      if (!formTitle && initialTitle) {
        formTitle = initialTitle;
        console.log('[DEBUG] Utilisation du titre fourni en props:', formTitle);
      }
      
      if (!formDescription && initialDescription) {
        formDescription = initialDescription;
        console.log('[DEBUG] Utilisation de la description fournie en props:', formDescription);
      }

      // Préparer les données pour l'API de création finale avec priorité pour:
      // 1. Champs du formulaire parent (DOM)
      // 2. Props initialTitle/initialDescription
      // 3. Données de mergedResults
      const formData = new FormData();
      
      // Utiliser les données du formulaire parent si disponibles, sinon fallback
      formData.append('title', formTitle || (mergedResults.titre || mergedResults.title || ""));
      formData.append('description', formDescription || mergedResults.description || "");
      
      // Utiliser des valeurs par défaut si typeId/subtypeId ne sont pas définis
      if (typeId !== undefined) {
        formData.append('type_id', typeId.toString());
      } else {
        // Valeur par défaut pour type_id (1 = exercice)
        formData.append('type_id', "1");
      }
      
      if (subtypeId !== undefined) {
        formData.append('sub_type_id', subtypeId.toString());
      } else {
        // Valeur par défaut pour sub_type_id (1 = qcm)
        formData.append('sub_type_id', "1");
      }
      
      formData.append('source_type', 'ai');
      
      // Utiliser le chemin HTML généré lors de la fusion
      formData.append('html_path', htmlPreviewUrl);
      
      // Ajouter les IDs d'associations (vides si non fournis)
      formData.append('study_object_ids_json', JSON.stringify(mergedResults.study_object_ids || []));
      formData.append('session_ids_json', JSON.stringify(mergedResults.session_ids || []));
      formData.append('objective_ids_json', JSON.stringify(mergedResults.objective_ids || []));
      
      // Log des données envoyées
      console.log('[DEBUG] Données envoyées pour création de ressource:');
      for (let pair of formData.entries()) {
        console.log(`- ${pair[0]}: ${pair[1].toString().substring(0, 50)}${pair[1].toString().length > 50 ? '...' : ''}`);
      }
      
      // Utilisation de fetch natif au lieu d'axios comme pour handleMergeAll
      const response = await fetch(`${API_BASE_URL}/api/v1/resources/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
          // Ne pas définir Content-Type pour laisser le navigateur le faire correctement
        },
        body: formData
      });
      
      // Vérifier la réponse
      if (!response.ok) {
        const errorData = await response.json();
        console.error('[DEBUG] Erreur fetch:', response.status, errorData);
        throw new Error(JSON.stringify(errorData));
      }
      
      const data = await response.json();
      console.log('[DEBUG] Ressource créée avec succès:', data);
      
      // Si la fonction onSuccess est fournie, l'appeler avec l'ID de la ressource créée
      if (onSuccess && typeof onSuccess === 'function') {
        console.log('[DEBUG] Appel de onSuccess avec ID:', data.id);
        onSuccess(data.id);
        return; // Arrêter ici car onSuccess gère déjà la fermeture/navigation
      }
      
      // Si la fonction onClose est fournie, la appeler pour fermer le formulaire
      if (onClose && typeof onClose === 'function') {
        console.log('[DEBUG] Appel de onClose pour fermer le formulaire');
        onClose();
      } else {
        // Alternative si onClose n'est pas fourni - utiliser navigate plutôt que window.location
        // pour préserver le contexte d'authentification
        console.log('[DEBUG] onClose non disponible, utilisation de navigate');
        navigate('/resources');
      }
      
    } catch (error) {
      console.error('[DEBUG] Erreur lors de la finalisation:', error);
      handleApiError(error, 'Erreur lors de la finalisation de la ressource');
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction utilitaire pour générer un HTML simple à partir des données
  const generateSimpleHtml = (data) => {
    let htmlContent = `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${data.titre || data.title || "Ressource QCM"}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
          h1 { color: #2c3e50; }
          .question { margin-bottom: 20px; border: 1px solid #eee; padding: 15px; border-radius: 5px; }
          .option { margin: 10px 0; }
          .correct { color: #27ae60; font-weight: bold; }
        </style>
      </head>
      <body>
        <h1>${data.titre || data.title || "QCM"}</h1>
        <p>${data.description || ""}</p>
    `;

    // Ajouter les informations de niveau et thème si disponibles
    if (data.niveau || data.theme) {
      htmlContent += `<p><strong>Niveau :</strong> ${data.niveau || "Non spécifié"} | <strong>Thème :</strong> ${data.theme || "Non spécifié"}</p>`;
    }

    // Ajouter les questions si disponibles
    if (data.questions && Array.isArray(data.questions)) {
      htmlContent += `<div class="questions">`;
      
      data.questions.forEach((q, qIndex) => {
        htmlContent += `
          <div class="question">
            <h3>Question ${qIndex + 1}: ${q.question || q.text || ""}</h3>
        `;

        // Ajouter les options si disponibles
        if (q.options && Array.isArray(q.options)) {
          htmlContent += `<div class="options">`;
          
          q.options.forEach((opt, optIndex) => {
            const isCorrect = opt.isCorrect ? ' correct' : '';
            htmlContent += `
              <div class="option${isCorrect}">
                <label>
                  <input type="radio" name="q${qIndex}" value="${optIndex}">
                  ${opt.text || opt.texte || ""}
                </label>
              </div>
            `;
          });
          
          htmlContent += `</div>`;
        }
        
        htmlContent += `</div>`;
      });
      
      htmlContent += `</div>`;
    }

    htmlContent += `
      </body>
      </html>
    `;

    return htmlContent;
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }
  
  if (error && !showAuthError) {
    return (
      <Card>
        <CardContent>
          <Alert severity="error" sx={{ my: 2 }}>{error}</Alert>
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
            {onCancel && (
              <Button variant="outlined" color="secondary" onClick={onCancel} sx={{ mr: 1 }}>
                Annuler
              </Button>
            )}
            <Button variant="contained" color="primary" onClick={() => fetchSchema()}>
              Réessayer
            </Button>
          </Box>
        </CardContent>
      </Card>
    );
  }
  
  if (!formSchema && !error) {
    return (
      <Card>
        <CardContent>
          <Alert severity="warning" sx={{ my: 2 }}>Aucun schéma reçu du backend.</Alert>
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
            {onCancel && (
              <Button variant="outlined" color="secondary" onClick={onCancel} sx={{ mr: 1 }}>
                Annuler
              </Button>
            )}
            <Button variant="contained" color="primary" onClick={() => fetchSchema()}>
              Réessayer
            </Button>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardContent>
          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            <Step>
              <StepLabel>Configuration</StepLabel>
            </Step>
            <Step>
              <StepLabel>Génération</StepLabel>
            </Step>
            <Step>
              <StepLabel>Édition</StepLabel>
            </Step>
            <Step>
              <StepLabel>Fusion</StepLabel>
            </Step>
          </Stepper>
          
          {activeStep === 0 && formSchema && (
            <>
              <Typography variant="h6" gutterBottom>
                {formSchema.title || "Formulaire de génération"}
              </Typography>
              {formSchema.description && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  {formSchema.description}
                </Typography>
              )}
              
              <Box 
                component="div" 
                onSubmit={(e) => { e.preventDefault(); }} 
                noValidate 
                autoComplete="off"
              >
                <Grid container spacing={2}>
                  {formSchema.fields.map((field) => (
                    <Grid item xs={12} key={field.name}>
                      {field.type === 'number' ? (
                        <TextField
                          id={field.name}
                          name={field.name}
                          label={field.description || field.label}
                          type="number"
                          value={formData[field.name] || ''}
                          onChange={handleChange}
                          fullWidth
                          required={field.required}
                          error={!!errors[field.name]}
                          helperText={errors[field.name] || ""}
                          InputProps={{
                            inputProps: {
                              min: field.validations?.min,
                              max: field.validations?.max
                            }
                          }}
                          margin="normal"
                        />
                      ) : isListField(field) ? (
                        <TextField
                          id={field.name}
                          name={field.name}
                          label={field.description || field.label}
                          value={formData[field.name] || ''}
                          onChange={(e) => handleListChange(field.name, e.target.value)}
                          fullWidth
                          required={field.required}
                          error={!!errors[field.name]}
                          helperText={errors[field.name] || "Entrez les valeurs séparées par des virgules"}
                          multiline
                          rows={3}
                          margin="normal"
                        />
                      ) : field.validations && field.validations.enum ? (
                        <FormControl 
                          fullWidth 
                          error={!!errors[field.name]}
                          required={field.required}
                          margin="normal"
                        >
                          <InputLabel id={`${field.name}-label`}>{field.description || field.label}</InputLabel>
                          <Select
                            labelId={`${field.name}-label`}
                            id={field.name}
                            name={field.name}
                            value={formData[field.name] || ''}
                            onChange={handleChange}
                            label={field.description || field.label}
                          >
                            <MenuItem value="">
                              <em>-- Sélectionner --</em>
                            </MenuItem>
                            {field.validations.enum.map((option) => (
                              <MenuItem key={option} value={option}>
                                {option}
                              </MenuItem>
                            ))}
                          </Select>
                          {(errors[field.name] || field.description) && (
                            <FormHelperText>
                              {errors[field.name] || field.description}
                            </FormHelperText>
                          )}
                        </FormControl>
                      ) : (
                        <TextField
                          id={field.name}
                          name={field.name}
                          label={field.description || field.label}
                          value={formData[field.name] || ''}
                          onChange={handleChange}
                          fullWidth
                          required={field.required}
                          error={!!errors[field.name]}
                          helperText={errors[field.name] || ""}
                          multiline={field.multiline || (typeof formData[field.name] === 'string' && formData[field.name].length > 100)}
                          rows={field.multiline ? 4 : 1}
                          margin="normal"
                        />
                      )}
                    </Grid>
                  ))}
                </Grid>
                
                <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between' }}>
  <div>
    {activeStep > 0 && (
      <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={handlePrevStep}>
        Précédent
      </Button>
    )}
  </div>
  <div>
                    {onCancel && (
                      <Button 
                        variant="outlined" 
                        color="secondary" 
                        onClick={onCancel}
                        sx={{ mr: 1 }}
                      >
                        Annuler
                      </Button>
                    )}
                    <Button 
                      variant="contained" 
                      color="primary" 
                      onClick={handleSubmitForm}
                      disabled={loading}
                    >
                      Générer
                    </Button>
                  </div>
                </Box>
              </Box>
            </>
        )}
        
        {activeStep === 1 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CircularProgress size={60} />
            <Typography variant="h6" sx={{ mt: 2 }}>
              Génération en cours...
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Cela peut prendre quelques instants
            </Typography>
            <Button 
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={handlePrevStep}
            >
              Précédent
            </Button>
          </Box>
        )}
        
        {activeStep === 2 && editedResults.length > 0 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Édition des données brutes avant fusion
            </Typography>
            
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Ressource {currentEditIndex + 1} sur {editedResults.length} - {generatedTitles[currentEditIndex] || "Ressource générée"}
            </Typography>
            
            <ResourceEditorForm 
              initialTitle={initialTitle}
              initialDescription={initialDescription}
              initialData={editedResults[currentEditIndex]} 
              onSubmit={() => handleMergeAll()}
              onChange={(data) => handleEditorChange(currentEditIndex, data)}
              hideButtons={true}
            />
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
              <div>
                <Button
                  startIcon={<ArrowBackIcon />}
                  onClick={handleBackToConfiguration}
                  sx={{ mr: 1 }}
                >
                  Revenir à la configuration
                </Button>
                <Button
                  startIcon={<ArrowBackIcon />}
                  onClick={handlePrevResult}
                  disabled={currentEditIndex === 0}
                >
                  Résultat précédent
                </Button>
              </div>
              
              <div>
                {currentEditIndex === editedResults.length - 1 ? (
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleMergeAll}
                  >
                    Fusionner
                  </Button>
                ) : (
                  <Button
                    endIcon={<ArrowForwardIcon />}
                    variant="contained"
                    onClick={handleNextResult}
                  >
                    Suivant
                  </Button>
                )}
              </div>
            </Box>
          </Box>
        )}
        
        {activeStep === 3 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              Ressource créée avec succès
            </Typography>
            
            {mergeSuccess && htmlPreviewUrl && (
              <Box sx={{ my: 2, p: 2, border: '1px solid #ddd', borderRadius: 1 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Aperçu du contenu HTML:
                </Typography>
                <Button 
                  variant="outlined" 
                  color="primary"
                  href={htmlPreviewUrl}
                  target="_blank"
                  sx={{ mb: 2 }}
                >
                  Voir l'aperçu HTML
                </Button>
              </Box>
            )}
            
            <Typography color="text.secondary" paragraph>
              La ressource a été correctement fusionnée. Cliquez sur "Terminer" pour enregistrer définitivement le fichier HTML et compléter le processus.
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
              <div>
                <Button 
                  variant="outlined" 
                  startIcon={<ArrowBackIcon />}
                  onClick={handlePrevStep}
                >
                  Revenir à l'édition
                </Button>
              </div>
              <div>
                <Button 
                  variant="contained" 
                  color="primary" 
                  onClick={handleFinish}
                  disabled={isLoading || !mergeSuccess}
                >
                  {isLoading ? (
                    <>
                      <CircularProgress size={24} color="inherit" sx={{ mr: 1 }} />
                      Finalisation...
                    </>
                  ) : (
                    "Finaliser la ressource"
                  )}
                </Button>
              </div>
            </Box>
          </Box>
        )}
        </CardContent>
      </Card>
      
      <Dialog
        open={showAuthError}
        onClose={handleCloseAuthError}
        aria-labelledby="auth-error-dialog-title"
        aria-describedby="auth-error-dialog-description"
      >
        <DialogTitle id="auth-error-dialog-title">
          {"Session expirée"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="auth-error-dialog-description">
            {error || "Votre session a expiré. Veuillez vous reconnecter pour continuer."}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAuthError} color="primary">
            Annuler
          </Button>
          <Button onClick={handleRedirectToLogin} color="primary" autoFocus>
            Se connecter
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default DynamicAIForm;
