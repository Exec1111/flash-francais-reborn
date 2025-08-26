import React, { useState, useEffect } from 'react';
import { Typography, Link as MuiLink } from '@mui/material';
import LinkIcon from '@mui/icons-material/Link';
import CircularProgress from '@mui/material/CircularProgress';
import resourceService from '../../services/resourceService'; // Assurez-vous que le chemin est correct
import { API_BASE_URL } from '../../services/api'; // Utiliser l'API_BASE_URL centralisée

function ResourceDocumentLink({ resource }) {
    const [fileUrl, setFileUrl] = useState(null);
    const [fileName, setFileName] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        let isMounted = true;
        const fetchDetailsIfNeeded = async () => {
            // Si file_path existe déjà
            if (resource.file_path) {
                const url = `${API_BASE_URL}/media/uploads/${resource.file_path.startsWith('/') ? resource.file_path.substring(1) : resource.file_path}`;
                setFileUrl(url);
                setFileName(resource.file_path.split('/').pop());
                return;
            }

            // Si c'est une ressource AI sans file_path, aller chercher les détails
            if (resource.source_type && resource.source_type.toLowerCase() === 'ai' && !resource.file_path) {
                setLoading(true);
                setError(null);
                try {
                    const fullResource = await resourceService.getById(resource.id);
                    if (isMounted && fullResource.file_path) {
                        const url = `${API_BASE_URL}/media/uploads/${fullResource.file_path.startsWith('/') ? fullResource.file_path.substring(1) : fullResource.file_path}`;
                        setFileUrl(url);
                        setFileName(fullResource.file_path.split('/').pop());
                    } else if (isMounted) {
                        // Pas de file_path même après fetch
                        setError('Aucun document trouvé pour cette ressource IA.');
                    }
                } catch (err) {
                    console.error(`Erreur fetch détails resource ${resource.id}:`, err);
                    if (isMounted) {
                        setError('Erreur chargement document.');
                    }
                } finally {
                    if (isMounted) {
                        setLoading(false);
                    }
                }
            }
        };

        fetchDetailsIfNeeded();

        return () => {
            isMounted = false; // Cleanup pour éviter les mises à jour d'état sur un composant démonté
        };
    }, [resource]); // Déclencher si la ressource change

    if (loading) {
        return <CircularProgress size={16} sx={{ mr: 1 }} />;
    }

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

export default ResourceDocumentLink;
