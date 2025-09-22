import React, { useState, useEffect } from 'react';
import { Typography, Link as MuiLink } from '@mui/material';
import LinkIcon from '@mui/icons-material/Link';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import CircularProgress from '@mui/material/CircularProgress';
import resourceService from '../../services/resourceService';
import { API_BASE_URL } from '../../services/api';

function ResourceActionLink({ resource }) {
    const [fileUrl, setFileUrl] = useState(null);
    const [runtimeUrl, setRuntimeUrl] = useState(null);
    const [fileName, setFileName] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Vérifier si c'est un exercice dynamique
    const isDynamicExercise = () => {
        // Vérifier plusieurs sources possibles pour le type et sous-type
        const typeKey = resource.type?.key?.toLowerCase() || 
                       resource.resource_type?.key?.toLowerCase() || '';
        const subtypeKey = resource.sub_type?.key?.toLowerCase() || 
                          resource.resource_sub_type?.key?.toLowerCase() || '';
        
        console.log('[DEBUG ResourceActionLink] Resource:', resource.id, 'Type:', typeKey, 'Subtype:', subtypeKey);
        
        return typeKey === 'exercice' && ['champlex2', 'champlex', 'qcm'].includes(subtypeKey);
    };

    useEffect(() => {
        let isMounted = true;
        const fetchDetailsIfNeeded = async () => {
            // Toujours fetch les détails complets pour avoir toutes les informations
            setLoading(true);
            setError(null);
            try {
                const fullResource = await resourceService.getById(resource.id);
                console.log('[DEBUG ResourceActionLink] Full resource:', fullResource);
                if (!isMounted) return;

                // Détection exercice dynamique
                const typeKey = fullResource.type?.key?.toLowerCase() || fullResource.resource_type?.key?.toLowerCase() || '';
                const subtypeKey = fullResource.sub_type?.key?.toLowerCase() || fullResource.resource_sub_type?.key?.toLowerCase() || '';
                const dynamicSubtypes = new Set(['champlex2', 'champlex', 'qcm', 'pendu']);
                const isExercise = typeKey === 'exercice' || dynamicSubtypes.has(subtypeKey);

                // Helpers
                const toFullUrl = (raw) => {
                    if (!raw) return null;
                    const base = (API_BASE_URL || '').replace(/\/api\/?$/, '');
                    const norm = String(raw).replace(/\\/g, '/');
                    return norm.startsWith('http') ? norm : `${base}${norm.startsWith('/') ? norm : `/${norm}`}`;
                };

                const looksHtml = (s) => typeof s === 'string' && s.toLowerCase().trim().endsWith('.html');

                if (isExercise) {
                    // 1) runtime_html_url prioritaire
                    if (fullResource.runtime_html_url) {
                        const cacheBuster = Date.now();
                        const u = toFullUrl(fullResource.runtime_html_url);
                        setRuntimeUrl(`${u}${u.includes('?') ? '&' : '?'}_t=${cacheBuster}`);
                        return;
                    }
                    // 2) runtime_html_path
                    if (fullResource.runtime_html_path) {
                        const cacheBuster = Date.now();
                        const norm = String(fullResource.runtime_html_path).replace(/\\/g, '/');
                        const base = (API_BASE_URL || '').replace(/\/api\/?$/, '');
                        let u;
                        if (norm.startsWith('http')) u = norm; 
                        else if (norm.startsWith('/media/uploads/')) u = `${base}${norm}`;
                        else if (norm.startsWith('uploads/')) u = `${base}/media/uploads/${norm}`;
                        else u = `${base}/media/uploads/${norm.replace(/^\//, '')}`;
                        setRuntimeUrl(`${u}${u.includes('?') ? '&' : '?'}_t=${cacheBuster}`);
                        return;
                    }
                    // 3) html_url / html_content_url
                    const htmlLink = fullResource.html_url || fullResource.html_content_url;
                    if (htmlLink) {
                        setRuntimeUrl(toFullUrl(htmlLink));
                        return;
                    }
                    // 4) .html file_path/url
                    if (looksHtml(fullResource.file_path)) {
                        const rel = String(fullResource.file_path).replace(/^\//, '');
                        setRuntimeUrl(`${(API_BASE_URL || '').replace(/\/api\/?$/, '')}/media/uploads/${rel}`);
                        return;
                    }
                    if (looksHtml(fullResource.url)) {
                        setRuntimeUrl(toFullUrl(fullResource.url));
                        return;
                    }
                    setError('Activité non disponible.');
                    return;
                }

                // Documents statiques
                if (fullResource.file_path) {
                    const url = `${API_BASE_URL}/media/uploads/${fullResource.file_path.startsWith('/') ? 
                        fullResource.file_path.substring(1) : fullResource.file_path}`;
                    setFileUrl(url);
                    setFileName(fullResource.file_path.split('/').pop());
                } else {
                    setError(fullResource.source_type?.toLowerCase() === 'ai' ? 'Document IA non trouvé' : 'Aucun document');
                }
            } catch (err) {
                console.error(`Erreur fetch resource ${resource.id}:`, err);
                if (isMounted) setError('Erreur chargement.');
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchDetailsIfNeeded();

        return () => {
            isMounted = false;
        };
    }, [resource]);


    if (loading) {
        return <CircularProgress size={16} sx={{ mr: 1 }} />;
    }

    // Afficher le bouton "Lancer l'activité" pour les exercices dynamiques
    if (runtimeUrl) {
        return (
            <MuiLink 
              href={runtimeUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                textDecoration: 'none',
                color: '#10b981',
                '&:hover': {
                  color: '#059669'
                }
              }}
            >
              <RocketLaunchIcon fontSize="small" sx={{ mr: 0.5 }} />
              Lancer l'activité
            </MuiLink>
        );
    }

    // Afficher le bouton "Ouvrir le document" pour les ressources statiques
    if (fileUrl) {
        return (
            <MuiLink 
              href={fileUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              sx={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}
            >
              <LinkIcon fontSize="small" sx={{ mr: 0.5 }} />
              Ouvrir le document
            </MuiLink>
        );
    }

    // Afficher une erreur ou le message par défaut
    const message = error || (resource.source_type?.toLowerCase() === 'ai' ? 'Document IA non trouvé' : 'Aucun document');
    
    return (
        <Typography variant="body2" color={error ? "error" : "text.secondary"}>
            {message}
        </Typography>
    );
}

export default ResourceActionLink;
