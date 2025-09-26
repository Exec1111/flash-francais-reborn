import { useState } from 'react';
import resourceService from '../../../services/resourceService';
import api, { API_BASE_URL } from '../../../services/api';

/**
 * Hook personnalisé pour gérer la logique de soumission du formulaire
 * 
 * @param {Object} formData - Données du formulaire à soumettre
 * @param {Function} validateForm - Fonction de validation du formulaire
 * @param {Function} onSuccess - Callback appelé en cas de succès
 * @returns {Object} État et fonctions liés à la soumission du formulaire
 */
const useSubmitLogic = (formData, validateForm, onSuccess) => {
  const [isLoading, setIsLoading] = useState(false);
  const [generationResults, setGenerationResults] = useState([]);
  const [currentEditIndex, setCurrentEditIndex] = useState(0);
  const [editedResults, setEditedResults] = useState([]);
  const [mergedResults, setMergedResults] = useState(null);
  const [progress, setProgress] = useState([]);
  const [generatedTitles, setGeneratedTitles] = useState([]);
  const [resourceId, setResourceId] = useState(null);
  const [htmlPreviewUrl, setHtmlPreviewUrl] = useState(null);
  const [mergeSuccess, setMergeSuccess] = useState(false);
  const [localHtmlContent, setLocalHtmlContent] = useState("");

  /**
   * Gère la soumission du formulaire
   */
  const handleSubmit = async () => {
    // Validation du formulaire
    if (!validateForm()) {
      console.log('[DEBUG][handleSubmit] Validation du formulaire échouée. Arrêt de la génération.');
      updateProgress("Validation du formulaire échouée", "error");
      return;
    }
    
    setIsLoading(true);
    setProgress([]);
    updateProgress("Préparation de la génération...", "info");
    
    try {
      // Vérifier que les clés de type sont présentes
      if (!formData.typeKey || !formData.subtypeKey) {
        console.error('[ERROR][handleSubmit] Clés de type manquantes:', { typeKey: formData.typeKey, subtypeKey: formData.subtypeKey });
        updateProgress("Données de formulaire incomplètes", "error");
        throw new Error("Type de ressource non défini");
      }

      // Si mode PDF + type/subtype supportés, appeler l'orchestrateur PDF (détection insensible à la casse)
      const sourceModeNorm = (formData.sourceMode || '').toLowerCase();
      const isPdfMode = sourceModeNorm === 'pdf_resource' || sourceModeNorm === 'pdf_file';
      const typeKeyNorm = (formData.typeKey || '').toLowerCase();
      const subtypeKeyNorm = (formData.subtypeKey || '').toLowerCase();
      const supportsPdfOrchestrator = typeKeyNorm === 'exercice' && subtypeKeyNorm === 'analyse_texte';
      console.log('[DEBUG][handleSubmit] Mode/Type/Subtype:', {
        sourceMode: formData.sourceMode,
        typeKey: formData.typeKey,
        subtypeKey: formData.subtypeKey,
        isPdfMode,
        supportsPdfOrchestrator
      });
      if (isPdfMode && supportsPdfOrchestrator) {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error("Aucun jeton d'authentification trouvé");
        }

        // Validations spécifiques PDF
        if (formData.sourceMode === 'pdf_resource' && !formData.pdfResourceId) {
          updateProgress("Veuillez sélectionner une ressource PDF.", "error");
          throw new Error("Ressource PDF manquante");
        }
        if (formData.sourceMode === 'pdf_file' && !formData.pdfFile) {
          updateProgress("Veuillez sélectionner un fichier PDF.", "error");
          throw new Error("Fichier PDF manquant");
        }

        updateProgress("Envoi du PDF à l'orchestrateur (extraction + génération)...", "info");

        // Logs de diagnostic côté frontend
        if (formData.sourceMode === 'pdf_file') {
          const f = formData.pdfFile;
          console.log('[DEBUG][PDF][frontend] Fichier sélectionné:', {
            present: !!f,
            name: f?.name,
            type: f?.type,
            size: f?.size
          });
          if (f && (!f.size || f.size === 0)) {
            updateProgress("Le fichier PDF sélectionné est vide (0 octet).", "error");
            throw new Error("Fichier PDF vide");
          }
        }

        const apiFormData = new FormData();
        if (formData.sourceMode === 'pdf_resource') {
          apiFormData.append('resource_id', String(formData.pdfResourceId));
        } else if (formData.sourceMode === 'pdf_file') {
          // Ajouter aussi le filename pour être explicite
          apiFormData.append('file', formData.pdfFile, formData.pdfFile?.name || 'upload.pdf');
        }
        apiFormData.append('ocr', String(Boolean(formData.ocr)));
        apiFormData.append('niveau', formData.niveau || '5ème');
        apiFormData.append('nombre_questions', String(formData.nombre_questions ?? 6));
        apiFormData.append('instructions_personnalisees', formData.instructions_personnalisees || '');

        // Trace du contenu de FormData (sans lire le fichier)
        try {
          for (const [key, val] of apiFormData.entries()) {
            if (val instanceof File) {
              console.log(`[DEBUG][PDF][frontend] FormData entry '${key}':`, { name: val.name, type: val.type, size: val.size });
            } else {
              console.log(`[DEBUG][PDF][frontend] FormData entry '${key}':`, String(val));
            }
          }
        } catch (e) {
          console.warn('[DEBUG][PDF][frontend] Impossible d\'itérer sur FormData.entries():', e);
        }

        const orchestratorUrl = `${API_BASE_URL}/api/v1/ai/analyse-texte-from-pdf`;
        console.log('[DEBUG][handleSubmit] Appel orchestrateur PDF:', orchestratorUrl);
        const response = await fetch(orchestratorUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
            // Laisser le navigateur définir le Content-Type multipart/form-data
          },
          body: apiFormData
        });

        if (!response.ok) {
          let errorMsg = `Erreur (${response.status}) lors de l'orchestration PDF`;
          try {
            const errData = await response.json();
            errorMsg = errData.detail || errorMsg;
          } catch (_) {}
          throw new Error(errorMsg);
        }

        const result = await response.json();
        console.log('[DEBUG][handleSubmit][PDF] Résultat orchestrateur:', result);

        if (result && result.content) {
          setGenerationResults([result.content]);
          setEditedResults([result.content]);
          updateProgress("Génération réussie via PDF", "success");
        } else {
          throw new Error("Contenu généré vide ou invalide (PDF)");
        }

        return; // Sortir après branche PDF; finally assurera l'arrêt du chargement
      }
      
      console.log('[DEBUG][handleSubmit] Fallback vers generate-resource', { isPdfMode, supportsPdfOrchestrator, typeKeyNorm, subtypeKeyNorm });
      // Préparation des données pour l'API JSON (mode texte ou fallback)
      const payload = {
        type_key: formData.typeKey,
        subtype_key: formData.subtypeKey,
        variables: {}
      };
      
      // Copier toutes les données utiles du formulaire dans les variables, en excluant les clés UI
      const EXCLUDED_KEYS = ['typeKey', 'subtypeKey', 'sourceMode', 'pdfResourceId', 'pdfResourceTitle', 'pdfFile', 'ocr'];
      Object.keys(formData).forEach(key => {
        if (!EXCLUDED_KEYS.includes(key)) {
          payload.variables[key] = formData[key];
        }
      });
      
      // Fonction pour récupérer les séances associées à une séquence
      const fetchSequenceSessions = async (sequenceId) => {
        try {
          console.log('[DEBUG][fetchSequenceSessions] Récupération des séances pour la séquence', sequenceId);
          
          if (!sequenceId) {
            console.warn('[DEBUG][fetchSequenceSessions] Aucun ID de séquence fourni');
            return [];
          }
          
          const token = localStorage.getItem('token');
          if (!token) {
            console.error('[ERROR][fetchSequenceSessions] Aucun jeton d\'authentification trouvé');
            return [];
          }
          
          // Utiliser l'instance api (axios) qui gère déjà le token et la base URL
          const response = await api.get(`/sequences/${sequenceId}/sessions`);
          const sessionsBasic = response.data;
          console.log('[DEBUG][fetchSequenceSessions] Séances de base récupérées:', sessionsBasic);
          
          // Récupérer les détails complets de chaque séance avec leurs ressources enrichies
          const sessionsWithResources = await Promise.all(sessionsBasic.map(async (session) => {
            try {
              // Récupérer les détails de la séance
              const sessionDetailResponse = await fetch(`${API_BASE_URL}/api/v1/sessions/${session.id}`, {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              });
              
              if (!sessionDetailResponse.ok) {
                console.warn(`[WARN][fetchSequenceSessions] Impossible de récupérer les détails de la séance ${session.id}:`, sessionDetailResponse.status);
                return session; // Retourner la version basique si impossible de récupérer les détails
              }
              
              const sessionDetail = await sessionDetailResponse.json();
              console.log(`[DEBUG][fetchSequenceSessions] Détails de la séance ${session.id} récupérés:`, sessionDetail);
              
              // Si la séance contient des ressources, enrichir ces ressources avec leurs détails complets
              if (sessionDetail.resources && sessionDetail.resources.length > 0) {
                console.log(`[DEBUG][fetchSequenceSessions] Enrichissement des ${sessionDetail.resources.length} ressources de la séance ${session.id}...`);
                
                // Récupérer les détails complets de chaque ressource
                const enrichedResources = await Promise.all(
                  sessionDetail.resources.map(async (basicResource) => {
                    try {
                      // Utiliser resourceService pour récupérer les détails complets de la ressource
                      const detailedResource = await resourceService.getResourceById(basicResource.id);
                      
                      // Récupérer le contenu HTML si le file_path existe
                      if (detailedResource.file_path) {
                        try {
                          // Construction de l'URL du fichier (comme dans ResourceView.js)
                          const fileUrl = `${API_BASE_URL}/media/uploads/${detailedResource.file_path.startsWith('/') ? 
                            detailedResource.file_path.substring(1) : detailedResource.file_path}`;
                          
                          console.log(`[DEBUG][fetchSequenceSessions] Récupération du contenu HTML à partir de l'URL: ${fileUrl}`);
                          
                          // Récupérer le contenu HTML avec un fetch
                          const contentResponse = await fetch(fileUrl, {
                            method: 'GET',
                            headers: {
                              'Authorization': `Bearer ${token}`
                            }
                          });
                          
                          if (contentResponse.ok) {
                            // Vérifier le type de contenu de la réponse
                            const contentType = contentResponse.headers.get('content-type');
                            
                            // Si c'est du texte ou de l'HTML, récupérer comme texte
                            if (contentType && (contentType.includes('text') || contentType.includes('html'))) {
                              const htmlContent = await contentResponse.text();
                              console.log(`[DEBUG][fetchSequenceSessions] Contenu HTML récupéré pour la ressource ${detailedResource.id} (${htmlContent.length} caractères)`);
                              
                              // Ajouter le contenu HTML à la ressource
                              detailedResource.content = htmlContent;
                            } else {
                              console.log(`[DEBUG][fetchSequenceSessions] Le fichier n'est pas au format texte/HTML: ${contentType}`);
                            }
                          } else {
                            console.warn(`[WARN][fetchSequenceSessions] Impossible de récupérer le contenu du fichier: ${contentResponse.status}`);
                          }
                        } catch (error) {
                          console.error(`[ERROR][fetchSequenceSessions] Erreur lors de la récupération du contenu HTML:`, error);
                        }
                      } else {
                        console.log(`[DEBUG][fetchSequenceSessions] Pas de file_path pour la ressource ${detailedResource.id}`);
                      }
                      
                      // Log détaillé de la structure complète de la ressource
                      console.log(`[DEBUG][fetchSequenceSessions] Structure COMPLÈTE de la ressource ${basicResource.id}:`, {
                        id: detailedResource.id,
                        title: detailedResource.title,
                        type_name: detailedResource.resource_type?.name || detailedResource.type_name || 'Non disponible',
                        sub_type_name: detailedResource.resource_sub_type?.name || detailedResource.sub_type_name || 'Non disponible',
                        description: detailedResource.description || 'Pas de description disponible',
                        file_path: detailedResource.file_path || 'Pas de chemin de fichier',
                        contentAvailable: detailedResource.content ? 'Oui' : 'Non',
                        contentSummary: typeof detailedResource.content === 'string' 
                          ? (detailedResource.content.length > 30 ? detailedResource.content.substring(0, 30) + '...' : detailedResource.content) 
                          : 'Non disponible (type: ' + typeof detailedResource.content + ')',
                      });
                      
                      return detailedResource;
                    } catch (error) {
                      console.warn(`[WARN][fetchSequenceSessions] Échec de récupération des détails de la ressource ${basicResource.id}:`, error);
                      return basicResource; // En cas d'échec, retourner la ressource basique
                    }
                  })
                );
                
                // Remplacer les ressources basiques par les ressources enrichies
                sessionDetail.resources = enrichedResources;
              }
              
              return sessionDetail;
            } catch (error) {
              console.error(`[ERROR][fetchSequenceSessions] Erreur lors de la récupération des détails de la séance ${session.id}:`, error);
              return session; // Retourner la version basique en cas d'erreur
            }
          }));
          
          console.log('[DEBUG][fetchSequenceSessions] Séances complètes avec ressources:', sessionsWithResources);
          return sessionsWithResources;
        } catch (error) {
          console.error('[ERROR][fetchSequenceSessions]', error);
          return [];
        }
      };
  
      // Fonction pour transformer les données selon le type de ressource
      const transformPayloadForSpecialTypes = async (typeKey, subtypeKey, variables) => {
        console.log('[DEBUG][transformPayloadForSpecialTypes] Transformation pour', typeKey, subtypeKey);
        const transformedVariables = { ...variables };
        
        // Cas spécifique pour les résumés de séquence
        if (typeKey === "LECON" && subtypeKey === "SEQUENCE_SUMMARY") {
          console.log('[DEBUG][transformPayloadForSpecialTypes] Transformation pour SEQUENCE_SUMMARY');
          
          // Transformation des objectifs pour s'assurer qu'ils ont des descriptions valides
          if (transformedVariables.objectifs) {
            transformedVariables.objectifs = transformedVariables.objectifs
              .filter(obj => obj && (obj.description !== null && obj.description !== undefined))
              .map(obj => ({
                description: obj.description || "Objectif non spécifié"
              }));
            
            // Si aucun objectif valide, ajouter un objectif par défaut
            if (transformedVariables.objectifs.length === 0) {
              transformedVariables.objectifs = [
                { description: "Comprendre les éléments clés de la séquence" }
              ];
            }
            
            console.log('[DEBUG][transformPayloadForSpecialTypes] Objectifs transformés:', transformedVariables.objectifs);
          }
          
          // Log des variables disponibles pour le débogage
          console.log('[DEBUG][transformPayloadForSpecialTypes] Variables disponibles:', Object.keys(variables));
          console.log('[DEBUG][transformPayloadForSpecialTypes] Variables complètes:', variables);
          
          // Récupérer l'ID de séquence de toutes les façons possibles
          let sequenceId = variables.sequence_id || variables.sequenceId || variables.id;
          
          // Pour le débogage, si aucun ID n'est trouvé, utiliser un ID hardcodé temporaire
          if (!sequenceId) {
            console.warn('[DEBUG][transformPayloadForSpecialTypes] Aucun ID de séquence trouvé dans les variables');
            // Utiliser un ID hardcodé pour le test - UNIQUEMENT pour le débogage
            sequenceId = 1; // Remplacer par un ID de séquence valide dans votre système
            console.log('[DEBUG][transformPayloadForSpecialTypes] Utilisation d\'un ID de séquence de test:', sequenceId);
          }
          
          console.log('[DEBUG][transformPayloadForSpecialTypes] Récupération des séances pour la séquence', sequenceId);
          const sessions = await fetchSequenceSessions(sequenceId);
          
          // Vérifier si des séances ont été récupérées
          if (sessions && sessions.length > 0) {
            console.log('[DEBUG][transformPayloadForSpecialTypes] Nombre de séances récupérées:', sessions.length);
            
            // Utiliser uniquement les vraies données des séances et leurs ressources associées
            transformedVariables.sessions = sessions.map(session => {
              // Log pour débogage
              console.log('[DEBUG][transformPayloadForSpecialTypes] Session:', session.title, 'Resources:', session.resources);
              
              // Formater les ressources existantes avec la structure attendue par le template YAML
              const formattedResources = session.resources && session.resources.length > 0 ?
                session.resources.map(resource => {
                  // Vérifier et log la structure détaillée de chaque ressource avant transformation
                  console.log('[DEBUG][transformPayloadForSpecialTypes] Resource brute avant transformation:', {
                    id: resource.id,
                    title: resource.title,
                    resource_type: resource.resource_type,
                    type_name: resource.type_name,
                    resource_sub_type: resource.resource_sub_type,
                    sub_type_name: resource.sub_type_name,
                    description: resource.description,
                    descriptionType: typeof resource.description,
                    contentType: typeof resource.content,
                    contentPreview: typeof resource.content === 'string' ? resource.content.substring(0, 30) + '...' : 'Non disponible',
                    allKeys: Object.keys(resource)
                  });
                  
                  // Décision sur la valeur de description à utiliser
                  let finalDescription = "Pas de description";
                  if (resource.description) {
                    finalDescription = resource.description;
                    console.log('[DEBUG][transformPayloadForSpecialTypes] Utilisation de resource.description:', resource.description);
                  } else if (typeof resource.content === 'string' && resource.content.length > 0) {
                    // Extraire un fragment du contenu comme description alternative si le contenu est un texte
                    finalDescription = `Extrait de contenu: ${resource.content.substring(0, 50)}...`;
                    console.log('[DEBUG][transformPayloadForSpecialTypes] Génération d\'une description à partir du contenu');
                  }
                  
                  // Créer un objet proprement structuré avec toutes les propriétés requises
                  const formattedResource = {
                    type_name: resource.resource_type?.name || resource.type_name || "Non spécifié",
                    sub_type_name: resource.resource_sub_type?.name || resource.sub_type_name || "Non spécifié",
                    title: resource.title || "",
                    description: finalDescription,
                    content: resource.content && resource.content.trim() ? resource.content : "<p>Contenu non disponible</p>"
                  };
                  
                  console.log('[DEBUG][transformPayloadForSpecialTypes] Resource formatée après transformation:', formattedResource);
                  
                  return formattedResource;
                }) : [];
              
              // Log des ressources formatées
              if (formattedResources.length > 0) {
                console.log('[DEBUG][transformPayloadForSpecialTypes] Ressources formatées pour la séance', session.title, ':', 
                  formattedResources.map(r => ({ title: r.title, type_name: r.type_name, sub_type_name: r.sub_type_name }))                
                );
              }
              
              // Structure finale de la séance avec ses ressources
              return {
                title: session.title || "",
                description: session.description || "Pas de description",
                notes: session.notes || "Pas de notes",
                resources: formattedResources
              };
            });
            
            // Ajouter un message dans le cas où les séances n'ont pas de ressources associées
            if (sessions.every(s => !s.resources || s.resources.length === 0)) {
              console.warn('[DEBUG][transformPayloadForSpecialTypes] Aucune ressource trouvée pour les séances');
            }
            
            console.log('[DEBUG][transformPayloadForSpecialTypes] Séances enrichies ajoutées aux variables:', transformedVariables.sessions);
          } else {
            console.warn('[DEBUG][transformPayloadForSpecialTypes] Aucune séance récupérée pour la séquence', sequenceId);
            // Ajouter au moins une séance fictive pour tester
            transformedVariables.sessions = [{
              title: "Séance fictive pour test",
              description: "Cette séance est créée automatiquement pour tester le générateur",
              notes: "Notes de test",
              resources: []
            }];
            console.log('[DEBUG][transformPayloadForSpecialTypes] Séance fictive ajoutée:', transformedVariables.sessions);
          }
          
          // Transformation des ressources pour avoir le bon format de nommage
          if (transformedVariables.ressources) {
            transformedVariables.ressources = transformedVariables.ressources.map(res => ({
              title: res.titre || res.title || "Ressource sans titre",
              type_name: res.type_name || res.type || "Non spécifié",
              sub_type_name: res.sub_type_name || "Non spécifié",
              description: res.description || "Pas de description disponible",
              content: res.content || ""
            }));
            
            console.log('[DEBUG][transformPayloadForSpecialTypes] Ressources transformées:', transformedVariables.ressources);
          }
        }
        
        return transformedVariables;
      };
      
      // Appliquer les transformations nécessaires aux variables (de façon asynchrone)
      payload.variables = await transformPayloadForSpecialTypes(
        formData.typeKey,
        formData.subtypeKey,
        payload.variables
      );
      
      // Affichage des données envoyées pour débogage
      console.log('[DEBUG][handleSubmit] Données envoyées à l\'API après transformation:', payload);
      console.log('[DEBUG][handleSubmit] Type de payload.variables:', typeof payload.variables, Array.isArray(payload.variables) ? 'array' : '', payload.variables instanceof Promise ? 'Promise' : '');
      
      // Appel à l'API
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error("Aucun jeton d'authentification trouvé");
      }
      
      const response = await fetch(`${API_BASE_URL}/api/v1/ai/generate-resource`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Erreur lors de la génération de la ressource");
      }
      
      const result = await response.json();
      console.log('[DEBUG][handleSubmit] Résultat de la génération:', result);
      
      // Mise à jour de l'état avec les résultats
      if (result.content) {
        setGenerationResults([result.content]);
        setEditedResults([result.content]);
        
        // Progression
        updateProgress("Génération réussie", "success");
        
        // Si un callback de succès est fourni, l'appeler
        // Nous le commentons car il est prématuré. Le vrai onSuccess est appelé dans handleFinish.
        // if (onSuccess) {
        //   onSuccess(result.content);
        // }
      } else {
        throw new Error("Aucun contenu généré");
      }
    } catch (error) {
      console.error('[ERROR][handleSubmit]', error);
      updateProgress(`Erreur: ${error.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Met à jour la progression de la génération
   * 
   * @param {string} message - Message de progression
   * @param {string} status - Statut (success, error, info)
   */
  const updateProgress = (message, status = "info") => {
    setProgress(prev => [...prev, { message, status, timestamp: new Date() }]);
  };

  /**
   * Gère la modification d'un résultat
   * 
   * @param {number} index - Index du résultat à modifier
   * @param {Object} newData - Nouvelles données
   */
  const handleEditorChange = (index, newData) => {
    const newResults = [...editedResults];
    newResults[index] = newData;
    setEditedResults(newResults);
  };

  /**
   * Passe au résultat précédent
   */
  const handlePrevResult = () => {
    if (currentEditIndex > 0) {
      setCurrentEditIndex(currentEditIndex - 1);
    }
  };

  /**
   * Passe au résultat suivant
   */
  const handleNextResult = () => {
    if (currentEditIndex < editedResults.length - 1) {
      setCurrentEditIndex(currentEditIndex + 1);
    }
  };

  /**
   * Gère la fusion des résultats en appelant l'API
   */
  const handleMergeAll = async () => {
    if (!generationResults || generationResults.length === 0) {
      updateProgress("Aucun résultat à fusionner", "error");
      return;
    }
    
    setIsLoading(true);
    updateProgress("Fusion des résultats en cours...", "info");
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error("Aucun jeton d'authentification trouvé");
      }
      
      // Champlex, Champlex2, QCM, Pendu et Quisuisje utilisent JSON-first: pas besoin de merge réel
      const subtypeKeyNorm = (formData.subtypeKey || '').toLowerCase();
      if (subtypeKeyNorm === 'champlex2' || subtypeKeyNorm === 'champlex' || subtypeKeyNorm === 'qcm' || subtypeKeyNorm === 'pendu' || subtypeKeyNorm === 'quisuisje') {
        console.log(`[DEBUG][handleMergeAll] ${subtypeKeyNorm} JSON-first: contournement du merge`);
        
        // Simuler une réponse de merge pour les types JSON-first
        const jsonData = editedResults.length > 0 ? editedResults[0] : generationResults[0];
        let placeholderUrl;
        switch(subtypeKeyNorm) {
          case 'champlex2':
            placeholderUrl = '/api/v1/ai/champlex2-json-placeholder';
            break;
          case 'champlex':
            placeholderUrl = '/api/v1/ai/champlex-json-placeholder';
            break;
          case 'qcm':
            placeholderUrl = '/api/v1/ai/qcm-json-placeholder';
            break;
          case 'pendu':
            placeholderUrl = '/api/v1/ai/pendu-json-placeholder';
            break;
          case 'quisuisje':
            placeholderUrl = '/api/v1/ai/quisuisje-json-placeholder';
            break;
          default:
            placeholderUrl = '/api/v1/ai/json-placeholder';
        }
        
        setMergedResults({
          html_url: placeholderUrl,
          data_json: jsonData,
          session_ids: formData.session_ids || [],
          objective_ids: formData.objective_ids || []
        });
        
        updateProgress(`Données ${subtypeKeyNorm} préparées (JSON-first)`, "success");
        setMergeSuccess(true);
        setIsLoading(false);
        return;
      }
      
      // Préparer les données pour la fusion (autres types)
      const mergeData = new FormData();
      mergeData.append('type_key', formData.typeKey);
      mergeData.append('subtype_key', formData.subtypeKey);
      // La plupart des schémas attendent un objet (et non un tableau). On envoie le premier résultat.
      const firstResult = (editedResults && editedResults.length > 0)
        ? editedResults[0]
        : (generationResults && generationResults.length > 0 ? generationResults[0] : {});
      mergeData.append('data_json', JSON.stringify(firstResult));
      
      // Appel à l'API de fusion
      const response = await fetch(`${API_BASE_URL}/api/v1/ai/merge-resource`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: mergeData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Erreur lors de la fusion");
      }
      
      const data = await response.json();
      console.log('[DEBUG][handleMergeAll] Fusion réussie:', data);
      
      // Stocker les résultats fusionnés
      setMergedResults({
        ...data,
        session_ids: formData.session_ids || [],
        objective_ids: formData.objective_ids || []
      });
      
      updateProgress("Fusion terminée avec succès", "success");
      setMergeSuccess(true);
      
    } catch (error) {
      console.error('[ERROR][handleMergeAll]', error);
      updateProgress(`Erreur lors de la fusion: ${error.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * Traite les résultats de fusion réussis
   */
  const handleSuccessfulMerge = (data) => {
    // Extraire les informations importantes du formulaire d'édition
    const title = editedResults[0]?.titre || editedResults[0]?.title || "";
    const description = editedResults[0]?.description || "";
    
    console.log('[DEBUG] Données extraites du formulaire d\'\u00e9dition:');
    console.log('- title/titre:', title);
    console.log('- description:', description);
    
    // Stocker les résultats fusionnés avec les données complètes
    const mergedResult = {
      ...editedResults[0],  // Données du formulaire d'édition
      ...data,              // Données de l'API (comme html_url)
      titre: title,         // S'assurer que le titre est bien conservé
      title: title,         // Doublon pour compatibilité
      description: description
    };
    
    setMergedResults(mergedResult);
    
    // Définir l'URL de prévisualisation HTML
    if (data && data.html_url) {
      setHtmlPreviewUrl(data.html_url);
      setLocalHtmlContent(data.html_content || "");
      setMergeSuccess(true);
      updateProgress("Fusion réussie", "success");
    }
  };

  /**
   * Finalise la ressource en créant l'enregistrement définitif dans la base de données
   */
  const handleFinish = async () => {
    setIsLoading(true);
    updateProgress("Préparation de la création de ressource...", "info");
    
    try {
      // Vérifier l'authentification
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error("Authentification requise. Veuillez vous connecter.");
      }

      // Vérifier que nous avons bien les résultats de fusion et l'URL de prévisualisation
      if (!mergedResults || !mergedResults.html_url) {
        throw new Error("Aucune ressource fusionnée disponible. Veuillez d'abord effectuer la fusion.");
      }

      updateProgress("Préparation des données...", "info");
      
      // Extraire les informations importantes de formData (l'argument du hook)
      // formData contient les données du formulaire, y compris title et description pré-remplis ou saisis.
      console.log('[DEBUG][handleFinish] Contenu de formData reçu par useSubmitLogic:', JSON.stringify(formData, null, 2));

      const title = formData.title || formData.titre || ""; // formData.title est prioritaire
      const description = formData.description || "";
      const typeIdToSubmit = formData.typeId || "1";
      const subtypeIdToSubmit = formData.subtypeId || "1";
      
      console.log('[DEBUG][handleFinish] Valeurs extraites pour la soumission API:');
      console.log('- Titre (formData.title || formData.titre):', title);
      console.log('- Description (formData.description):', description);
      console.log('- Type ID (formData.typeId):', typeIdToSubmit, '(Original formData.typeId:', formData.typeId, ')');
      console.log('- Subtype ID (formData.subtypeId):', subtypeIdToSubmit, '(Original formData.subtypeId:', formData.subtypeId, ')');
      
      // Préparation du FormData pour l'API
      const apiFormData = new FormData();
      
      // Ajouter les informations de base de la ressource
      apiFormData.append('title', title);
      apiFormData.append('description', description);
      apiFormData.append('type_id', typeIdToSubmit);
      apiFormData.append('sub_type_id', subtypeIdToSubmit);
      apiFormData.append('source_type', 'ai');
      apiFormData.append('html_path', mergedResults.html_url);
      
      // Ajouter les IDs d'associations (vides si non fournis)
      // (Retiré) Ne plus envoyer d'association aux objets d'étude
      apiFormData.append('session_ids_json', JSON.stringify(mergedResults.session_ids || []));
      apiFormData.append('objective_ids_json', JSON.stringify(mergedResults.objective_ids || []));
      
      // JSON-first pour Champlex2, Champlex, QCM, Pendu et Quisuisje: envoyer le contenu généré par l'IA directement
      const subtypeKeyNorm = (formData.subtypeKey || '').toLowerCase();
      if ((subtypeKeyNorm === 'champlex2' || subtypeKeyNorm === 'champlex' || subtypeKeyNorm === 'qcm' || subtypeKeyNorm === 'pendu' || subtypeKeyNorm === 'quisuisje') && generationResults.length > 0) {
        const aiContent = generationResults[0]; // Premier résultat de génération
        if (aiContent && typeof aiContent === 'object') {
          apiFormData.append('ai_content_json', JSON.stringify(aiContent));
          console.log('[DEBUG][handleFinish] JSON-first: ai_content_json ajouté pour', subtypeKeyNorm);
        }
      }
      
      // Log des données envoyées
      console.log('[DEBUG][handleFinish] Données envoyées pour création de ressource:');
      for (let pair of apiFormData.entries()) {
        console.log(`- ${pair[0]}: ${pair[1].toString().substring(0, 50)}${pair[1].toString().length > 50 ? '...' : ''}`);
      }
      
      updateProgress("Envoi des données à l'API...", "info");
      
      // Appel à l'API pour créer la ressource finale
      const response = await fetch(`${API_BASE_URL}/api/v1/resources/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
          // Ne pas définir Content-Type pour laisser le navigateur le faire correctement
        },
        body: apiFormData
      });
      
      // Vérifier la réponse
      if (!response.ok) {
        const errorData = await response.json();
        console.error('[DEBUG][handleFinish] Erreur API:', response.status, errorData);
        throw new Error(errorData.detail || "Erreur lors de la création de la ressource");
      }
      
      const data = await response.json();
      console.log('[DEBUG][handleFinish] Ressource créée avec succès:', data);
      
      updateProgress("Ressource finalisée avec succès", "success");
      
      // Si un callback de succès est fourni, l'appeler avec l'ID de la ressource créée
      if (onSuccess && typeof onSuccess === 'function') {
        console.log('[DEBUG][handleFinish] Appel de onSuccess avec ID:', data.id);
        onSuccess(data.id);
      }
      
    } catch (error) {
      console.error('[ERROR][handleFinish]', error);
      updateProgress(`Erreur lors de la finalisation: ${error.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    generationResults,
    currentEditIndex,
    setCurrentEditIndex,
    editedResults,
    setEditedResults,
    mergedResults,
    setMergedResults,
    progress,
    generatedTitles,
    resourceId,
    setResourceId,
    htmlPreviewUrl,
    setHtmlPreviewUrl,
    mergeSuccess,
    setMergeSuccess,
    localHtmlContent,
    setLocalHtmlContent,
    handleSubmit,
    handleEditorChange,
    handlePrevResult,
    handleNextResult,
    handleMergeAll,
    handleFinish,
    updateProgress
  };
};

export default useSubmitLogic;
