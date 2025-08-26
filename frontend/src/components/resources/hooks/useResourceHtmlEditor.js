import { useState, useEffect } from 'react';
import { useLayout } from '../../../contexts/LayoutContext';
import { API_BASE_URL } from '../../../services/api';
import resourceService from '../../../services/resourceService';

/**
 * Custom hook for managing HTML editor state and functionality
 */
export const useResourceHtmlEditor = ({
  initialData,
  isEdit,
  resourceId,
  formatError
}) => {
  const { handleSidebarClose } = useLayout();

  // HTML editor state
  const [htmlContent, setHtmlContent] = useState('');
  const [tempHtmlContent, setTempHtmlContent] = useState('');
  const [isEditingMode, setIsEditingMode] = useState(false);
  const [showAiChat, setShowAiChat] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [htmlCacheBuster, setHtmlCacheBuster] = useState(Date.now());
  const [isLoadingHtml, setIsLoadingHtml] = useState(false);
  const [lastLoadedCacheBuster, setLastLoadedCacheBuster] = useState(Date.now());

  // Load HTML content
  useEffect(() => {
    if (isEditingMode || isLoadingHtml) {
      console.log('[DEBUG] Chargement HTML bloqué - isEditingMode:', isEditingMode, 'isLoadingHtml:', isLoadingHtml);
      return;
    }

    if (htmlCacheBuster === lastLoadedCacheBuster) {
      console.log('[DEBUG] Chargement HTML bloqué - cache buster identique:', htmlCacheBuster);
      return;
    }

    if (!initialData) {
      console.log('[DEBUG] Pas de initialData, pas de chargement HTML');
      return;
    }

    if (
      initialData.html_url ||
      initialData.html_content_url ||
      (initialData.file_path || '').endsWith('.html') ||
      (initialData.url || '').endsWith('.html')
    ) {
      console.log('[DEBUG] Démarrage chargement HTML avec cache buster:', htmlCacheBuster);
      setIsLoadingHtml(true);
      setLastLoadedCacheBuster(htmlCacheBuster);

      const relativeUrlRaw = initialData.html_url || initialData.html_content_url || initialData.file_path || initialData.url;
      const relativeUrl = (relativeUrlRaw || '').replace(/\\/g, '/');
      let fullUrl;
      if (relativeUrl.startsWith('http')) {
        fullUrl = relativeUrl;
      } else {
        let base = API_BASE_URL || '';
        base = base.replace(/\/api\/?$/, '');
        if (relativeUrl.startsWith('uploads/')) {
          fullUrl = `${base}/media/uploads/${relativeUrl}`;
        } else {
          fullUrl = `${base}${relativeUrl}`;
        }
      }

      const separator = fullUrl.includes('?') ? '&' : '?';
      const urlWithCacheBuster = `${fullUrl}${separator}_t=${htmlCacheBuster}`;

      console.log('[DEBUG] Chargement HTML avec URL:', urlWithCacheBuster);

      fetch(urlWithCacheBuster, {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      })
        .then(res => res.text())
        .then(content => {
          console.log('[DEBUG] Contenu HTML chargé avec succès, longueur:', content.length);
          console.log('[DEBUG] Aperçu du contenu (100 premiers caractères):', content.substring(0, 100));
          setHtmlContent(content);
        })
        .catch(err => {
          console.error('[DEBUG] Erreur lors du chargement du contenu HTML:', err);
          setHtmlContent('');
        })
        .finally(() => {
          console.log('[DEBUG] Fin de chargement HTML');
          setIsLoadingHtml(false);
        });
    }
  }, [initialData, htmlCacheBuster, isEditingMode, lastLoadedCacheBuster]);

  // Handle edit content
  const handleEditContent = () => {
    if (!isEditingMode) {
      console.log('[DEBUG] handleEditContent - htmlContent actuel:', htmlContent ? htmlContent.length : 'vide');

      if (htmlContent && htmlContent.trim()) {
        console.log('[DEBUG] handleEditContent - contenu déjà disponible, passage direct en mode édition');
        setIsEditingMode(true);
        console.log('[DEBUG] handleEditContent - setting tempHtmlContent (direct) avec longueur:', htmlContent.length);
        setTempHtmlContent(htmlContent);
        setShowAiChat(false);
        handleSidebarClose();
      } else {
        console.log('[DEBUG] handleEditContent - forçage du rechargement HTML');
        setHtmlCacheBuster(Date.now());

        const checkAndSetEditMode = (attempts = 0) => {
          if (attempts > 50) {
            console.log('[DEBUG] handleEditContent - timeout atteint, passage en mode édition avec contenu vide');
            setIsEditingMode(true);
            setTempHtmlContent(htmlContent || '');
            setShowAiChat(false);
            handleSidebarClose();
            return;
          }

          setTimeout(() => {
            console.log('[DEBUG] handleEditContent - vérification contenu (tentative', attempts + 1, '):', htmlContent ? htmlContent.length : 'vide');
            if (htmlContent && htmlContent.trim()) {
              console.log('[DEBUG] handleEditContent - contenu chargé, passage en mode édition');
              setIsEditingMode(true);
              console.log('[DEBUG] handleEditContent - setting tempHtmlContent avec longueur:', htmlContent.length);
              setTempHtmlContent(htmlContent);
              setShowAiChat(false);
              handleSidebarClose();
            } else {
              checkAndSetEditMode(attempts + 1);
            }
          }, 100);
        };

        checkAndSetEditMode();
      }
    }
  };

  // Handle activate AI
  const handleActivateAI = () => {
    setShowAiChat(true);
  };

  // Handle save HTML content
  const handleSaveHtmlContent = async () => {
    try {
      if (isEdit && resourceId) {
        const dataToSend = new FormData();
        dataToSend.append('html_content', tempHtmlContent);

        await resourceService.update(resourceId, dataToSend);
        console.log('[DEBUG] Sauvegarde réussie');
      }

      setHtmlContent(tempHtmlContent);
      setIsEditingMode(false);
      setShowAiChat(false);

      setTimeout(() => {
        setHtmlCacheBuster(Date.now());
      }, 100);

      return { success: true, message: 'Contenu HTML sauvegardé avec succès!' };
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du contenu HTML:', error);
      const displayError = formatError(error?.response?.data?.detail ?? error?.response?.data ?? error?.message ?? 'Erreur lors de la sauvegarde du contenu HTML');
      throw new Error(displayError);
    }
  };

  // Handle cancel editing
  const handleCancelEditing = () => {
    setIsEditingMode(false);
    setShowAiChat(false);
    setTempHtmlContent(htmlContent);
  };

  // Check if HTML editor should be shown
  const showHtmlEditor = isEdit && (
    Boolean(htmlContent && htmlContent.trim()) ||
    Boolean(initialData?.html_url || initialData?.html_content_url || (initialData?.file_path || '').endsWith('.html') || (initialData?.url || '').endsWith('.html'))
  );

  return {
    // State
    htmlContent,
    setHtmlContent,
    tempHtmlContent,
    setTempHtmlContent,
    isEditingMode,
    setIsEditingMode,
    showAiChat,
    setShowAiChat,
    aiLoading,
    setAiLoading,
    htmlCacheBuster,
    setHtmlCacheBuster,
    isLoadingHtml,
    showHtmlEditor,

    // Handlers
    handleEditContent,
    handleActivateAI,
    handleSaveHtmlContent,
    handleCancelEditing,
  };
};