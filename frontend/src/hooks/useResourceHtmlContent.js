import { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '../services/api';

/**
 * Hook personnalisé pour gérer le contenu HTML des ressources
 * Gère le chargement, l'édition et la sauvegarde du contenu HTML
 */
export const useResourceHtmlContent = (initialData, resourceId, isEdit) => {
  // --- HTML Editor States ---
  const [showAiChat, setShowAiChat] = useState(false);
  const [isEditingMode, setIsEditingMode] = useState(false);
  const [tempHtmlContent, setTempHtmlContent] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [htmlCacheBuster, setHtmlCacheBuster] = useState(Date.now());
  const [isLoadingHtml, setIsLoadingHtml] = useState(false);
  const [lastLoadedCacheBuster, setLastLoadedCacheBuster] = useState(Date.now());
  const [pendingEditMode, setPendingEditMode] = useState(false);
  const [htmlContent, setHtmlContent] = useState('');

  // Computed value for dynamic activity detection
  const isDynamicActivity = (() => {
    const hasRuntimePath = Boolean(initialData?.runtime_html_path);
    const hasDataJson = Boolean(initialData?.data_json);
    const hasRuntimeUrl = Boolean(initialData?.runtime_html_url);

    const isDynamic = hasRuntimePath || hasDataJson || hasRuntimeUrl;

    console.log('[DEBUG useResourceHtmlContent] isDynamicActivity (technique):', {
      resourceId: initialData?.id,
      hasRuntimePath,
      hasDataJson,
      hasRuntimeUrl,
      runtime_html_path: initialData?.runtime_html_path,
      isDynamic
    });

    return isDynamic;
  })();

  // Afficher l'éditeur HTML (statique) uniquement pour les ressources NON dynamiques
  const showHtmlEditor = isEdit && !isDynamicActivity;

  // HTML content loading effect
  useEffect(() => {
    console.log('[DEBUG useResourceHtmlContent] useEffect HTML - Démarrage avec conditions:', {
      isEditingMode, isLoadingHtml, htmlCacheBuster, lastLoadedCacheBuster,
      hasInitialData: !!initialData,
      hasHtmlPath: !!(initialData?.html_url || initialData?.html_content_url ||
                     (initialData?.file_path || '').endsWith('.html') ||
                     (initialData?.url || '').endsWith('.html'))
    });

    if (isEditingMode || isLoadingHtml || htmlCacheBuster === lastLoadedCacheBuster || !initialData) {
      console.log('[DEBUG useResourceHtmlContent] Chargement HTML bloqué');
      return;
    }

    if (initialData.html_url || initialData.html_content_url ||
        (initialData.file_path || '').endsWith('.html') ||
        (initialData.url || '').endsWith('.html')) {
      console.log('[DEBUG useResourceHtmlContent] Démarrage chargement HTML avec cache buster:', htmlCacheBuster);
      setIsLoadingHtml(true);
      setLastLoadedCacheBuster(htmlCacheBuster);

      const relativeUrlRaw = initialData.html_url || initialData.html_content_url ||
                             initialData.file_path || initialData.url;
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

      console.log('[DEBUG useResourceHtmlContent] Chargement HTML avec URL:', urlWithCacheBuster);

      fetch(urlWithCacheBuster, {
        cache: 'no-cache',
        headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
      })
        .then(res => res.text())
        .then(content => {
          console.log('[DEBUG useResourceHtmlContent] Contenu HTML chargé avec succès, longueur:', content.length);
          setHtmlContent(content);
        })
        .catch(err => {
          console.error('[DEBUG useResourceHtmlContent] Erreur lors du chargement du contenu HTML:', err);
          setHtmlContent('');
        })
        .finally(() => {
          console.log('[DEBUG useResourceHtmlContent] Fin de chargement HTML');
          setIsLoadingHtml(false);
        });
    }
  }, [initialData, htmlCacheBuster, isEditingMode, lastLoadedCacheBuster]);

  // Watch for HTML content changes to enter edit mode
  useEffect(() => {
    if (pendingEditMode && htmlContent && htmlContent.trim()) {
      console.log('[DEBUG useResourceHtmlContent] htmlContent détecté, passage en mode édition avec longueur:', htmlContent.length);
      setPendingEditMode(false);
      setIsEditingMode(true);
      setTempHtmlContent(htmlContent);
      setShowAiChat(false);
    }
  }, [htmlContent, pendingEditMode]);

  // Debug logging for tempHtmlContent changes
  useEffect(() => {
    console.log('[DEBUG useResourceHtmlContent] tempHtmlContent changed:', {
      hasContent: Boolean(tempHtmlContent),
      length: tempHtmlContent ? tempHtmlContent.length : 0,
      preview: tempHtmlContent ? tempHtmlContent.substring(0, 100) + '...' : 'vide'
    });
  }, [tempHtmlContent]);

  // Handlers
  const handleEditContent = useCallback(() => {
    if (!isEditingMode) {
      console.log('[DEBUG useResourceHtmlContent] handleEditContent - htmlContent actuel:', htmlContent ? htmlContent.length : 'vide');
      if (htmlContent && htmlContent.trim()) {
        console.log('[DEBUG useResourceHtmlContent] handleEditContent - contenu déjà disponible, passage direct en mode édition');
        setIsEditingMode(true);
        setTempHtmlContent(htmlContent);
        console.log('[DEBUG useResourceHtmlContent] handleEditContent - tempHtmlContent initialisé avec:', {
          length: htmlContent.length,
          preview: htmlContent.substring(0, 200) + '...'
        });
        setShowAiChat(false);
      } else {
        console.log('[DEBUG useResourceHtmlContent] handleEditContent - forçage du rechargement HTML et attente du contenu');
        setPendingEditMode(true);
        setHtmlCacheBuster(Date.now());
      }
    }
  }, [isEditingMode, htmlContent]);

  const handleActivateAI = useCallback(() => {
    setShowAiChat(true);
  }, []);

  const handleSaveHtmlContent = useCallback(async (resourceService) => {
    try {
      if (isEdit && resourceId) {
        const dataToSend = new FormData();
        dataToSend.append('html_content', tempHtmlContent);
        await resourceService.update(resourceId, dataToSend);
        console.log('[DEBUG useResourceHtmlContent] Sauvegarde réussie');
      }

      setHtmlContent(tempHtmlContent);
      setIsEditingMode(false);
      setShowAiChat(false);
      setPendingEditMode(false);

      setTimeout(() => {
        setHtmlCacheBuster(Date.now());
      }, 100);

      return { success: true, message: 'Contenu HTML sauvegardé avec succès!' };
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du contenu HTML:', error);
      const errorMessage = formatError(error?.response?.data?.detail ?? error?.response?.data ?? error?.message ?? 'Erreur lors de la sauvegarde du contenu HTML');
      throw new Error(errorMessage);
    }
  }, [isEdit, resourceId, tempHtmlContent]);

  const handleCancelEditing = useCallback(() => {
    setIsEditingMode(false);
    setShowAiChat(false);
    setPendingEditMode(false);
    setTempHtmlContent(htmlContent);
  }, [htmlContent]);

  // Helper: format error messages
  const formatError = (val) => {
    try {
      if (!val) return '';
      if (typeof val === 'string') return val;
      if (Array.isArray(val)) {
        const parts = val.map((item) => {
          if (!item) return '';
          if (typeof item === 'string') return item;
          if (item.msg) {
            const loc = Array.isArray(item.loc) ? item.loc.join('.') : (item.loc || '');
            return loc ? `${item.msg} (${loc})` : String(item.msg);
          }
          if (item.detail) return formatError(item.detail);
          return JSON.stringify(item);
        }).filter(Boolean);
        return parts.join(' | ');
      }
      if (typeof val === 'object') {
        if (val.detail) return formatError(val.detail);
        if (val.msg) return String(val.msg);
        return JSON.stringify(val);
      }
      return String(val);
    } catch (_) {
      return 'Une erreur est survenue.';
    }
  };

  return {
    // HTML states
    showAiChat,
    setShowAiChat,
    isEditingMode,
    setIsEditingMode,
    tempHtmlContent,
    setTempHtmlContent,
    aiLoading,
    setAiLoading,
    htmlContent,
    setHtmlContent,
    isDynamicActivity,
    showHtmlEditor,
    isLoadingHtml,

    // Handlers
    handleEditContent,
    handleActivateAI,
    handleSaveHtmlContent,
    handleCancelEditing,

    // Utility functions
    setHtmlCacheBuster,
    setPendingEditMode
  };
};