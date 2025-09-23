import { useCallback } from 'react';
import resourceService from '../services/resourceService';
import { API_BASE_URL } from '../services/api';

/**
 * Hook personnalisé pour gérer le lancement des activités des ressources
 * Contient toute la logique complexe de fallback pour ouvrir les ressources
 */
export const useResourceActivityLauncher = (initialData) => {
  const handleLaunchActivity = useCallback(async () => {
    try {
      console.log('[LAUNCH] start for resource', initialData?.id, {
        initial_runtime_html_url: initialData?.runtime_html_url,
        initial_runtime_html_path: initialData?.runtime_html_path,
        initial_html_url: initialData?.html_url,
        initial_html_content_url: initialData?.html_content_url,
        initial_file_path: initialData?.file_path,
        initial_url: initialData?.url,
      });

      // 1) Prefer runtime_html_url (server-computed URL) if already présent
      let runtimeUrlFromApi = initialData?.runtime_html_url || '';
      // 1bis) Sinon, runtime_html_path
      let runtimePath = initialData?.runtime_html_path;
      let latest = null;

      // 2) If missing, refetch latest resource to get generated runtime
      if (!runtimePath && initialData?.id) {
        try {
          latest = await resourceService.getById(initialData.id);
          console.log('[LAUNCH] latest fetched', latest?.id, {
            runtime_html_url: latest?.runtime_html_url,
            runtime_html_path: latest?.runtime_html_path,
            html_url: latest?.html_url,
            html_content_url: latest?.html_content_url,
            file_path: latest?.file_path,
            url: latest?.url,
          });
          runtimeUrlFromApi = latest?.runtime_html_url || runtimeUrlFromApi;
          runtimePath = latest?.runtime_html_path || runtimePath;
        } catch (e) {
          console.warn('[ResourceForm] Impossible de recharger la ressource pour récupérer runtime_html_path', e);
        }
      }

      // 2bis) Si runtime_html_url est disponible, ouvrir directement
      if (runtimeUrlFromApi) {
        const cacheBuster = Date.now();
        const base = (API_BASE_URL || '').replace(/\/api\/?$/, '');
        const norm = String(runtimeUrlFromApi).replace(/\\/g, '/');
        const fullUrl = norm.startsWith('http') ? norm : `${base}${norm.startsWith('/') ? norm : `/${norm}`}`;
        const withBuster = `${fullUrl}${fullUrl.includes('?') ? '&' : '?'}_t=${cacheBuster}`;
        window.open(withBuster, '_blank');
        return;
      }

      // 3) Fallbacks: try html_url/html_content_url, then .html file_path/url
      const tryOpenUrl = (raw) => {
        if (!raw) return false;
        const cacheBuster = Date.now();
        const base = (API_BASE_URL || '').replace(/\/api\/?$/, '');
        const full = raw.startsWith('http') ? raw : `${base}${raw.startsWith('/') ? raw : `/${raw}`}`;
        const withBuster = `${full}${full.includes('?') ? '&' : '?'}_t=${cacheBuster}`;
        window.open(withBuster, '_blank');
        return true;
      };

      if (!runtimePath) {
        // Prefer latest html links if available
        const htmlFromLatest = latest?.html_url || latest?.html_content_url;
        const htmlFromInitial = initialData?.html_url || initialData?.html_content_url;
        console.log('[LAUNCH] trying html links', { htmlFromLatest, htmlFromInitial });
        if (tryOpenUrl(htmlFromLatest) || tryOpenUrl(htmlFromInitial)) return;

        const fp = latest?.file_path || initialData?.file_path || '';
        const u = latest?.url || initialData?.url || '';
        const looksHtml = (s) => typeof s === 'string' && s.toLowerCase().trim().endsWith('.html');
        console.log('[LAUNCH] trying html-like paths', { fp, u, looksHtml_fp: looksHtml(fp), looksHtml_u: looksHtml(u) });
        if (looksHtml(fp)) {
          const rel = fp.replace(/^\//, '');
          const cacheBuster = Date.now();
          window.open(`${window.location.origin}/media/uploads/${rel}?_t=${cacheBuster}`, '_blank');
          return;
        }
        if (looksHtml(u)) {
          tryOpenUrl(u);
          return;
        }
      }

      if (runtimePath) {
        const cacheBuster = Date.now();
        const base = (API_BASE_URL || '').replace(/\/api\/?$/, '');
        const norm = String(runtimePath).replace(/\\/g, '/');
        let fullUrl;
        if (norm.startsWith('http')) {
          fullUrl = norm;
        } else if (norm.startsWith('/media/uploads/')) {
          fullUrl = `${base}${norm}`;
        } else if (norm.startsWith('uploads/')) {
          fullUrl = `${base}/media/uploads/${norm}`;
        } else {
          // generic fallback: treat as relative under /media/uploads
          const rel = norm.replace(/^\//, '');
          fullUrl = `${base}/media/uploads/${rel}`;
        }
        const runtimeUrl = `${fullUrl}${fullUrl.includes('?') ? '&' : '?'}_t=${cacheBuster}`;
        window.open(runtimeUrl, '_blank');
      } else {
        // Dernier recours: ouvrir la page de consultation qui sait lancer l'activité
        if (initialData?.id) {
          const viewUrl = `${window.location.origin}/resources/view/${initialData.id}`;
          console.log('[LAUNCH] final fallback to view page', viewUrl);
          window.open(viewUrl, '_blank');
        } else {
          alert("L'activité n'est pas encore disponible. Veuillez d'abord sauvegarder le contenu.");
        }
      }
    } catch (err) {
      console.error('[ResourceForm] Erreur lors du lancement de l\'activité:', err);
      alert("Impossible de lancer l'activité pour le moment.");
    }
  }, [initialData]);

  return {
    handleLaunchActivity
  };
};