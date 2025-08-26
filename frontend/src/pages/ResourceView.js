import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import resourceService from '../services/resourceService';
import resourceTypeService from '../services/resourceTypeService';
import { API_BASE_URL } from '../services/api';
import { 
    Box, Typography, CircularProgress, Alert, Button, Link, Divider, List, ListItem,
    Container, Card, CardContent, IconButton, Chip, Stack, FormControlLabel, Checkbox
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, PictureAsPdf as PictureAsPdfIcon, Description as DescriptionIcon, InsertDriveFile as InsertDriveFileIcon, OpenInNew as OpenInNewIcon } from '@mui/icons-material';
import StudyObjectChips from '../components/studyObjects/StudyObjectChips';

// Fonction pour formater les dates (peut être centralisée)
const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString('fr-FR', options);
};

function ResourceView() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [resource, setResource] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [studyObjects, setStudyObjects] = useState([]);
    const [loadingStudyObjects, setLoadingStudyObjects] = useState(false);
    const [errorStudyObjects, setErrorStudyObjects] = useState(null);
    
    // Nouveaux états pour le type et sous-type
    const [resourceType, setResourceType] = useState(null);
    const [resourceSubtype, setResourceSubtype] = useState(null);
    const [loadingTypes, setLoadingTypes] = useState(false);

    // Docling: statut, contenu et polling
    const [doclingStatus, setDoclingStatus] = useState(null);
    const [doclingMarkdown, setDoclingMarkdown] = useState('');
    const [doclingTables, setDoclingTables] = useState([]);
    const [doclingLoading, setDoclingLoading] = useState(false);
    const [doclingError, setDoclingError] = useState(null);
    const [polling, setPolling] = useState(false);
    const [reextractOpts, setReextractOpts] = useState({ force: false });
    const intervalRef = useRef(null);

    useEffect(() => {
        const fetchResource = async () => {
            setLoading(true);
            try {
                const data = await resourceService.getResourceById(id);
                setResource(data);
                setError(null);
            } catch (err) {
                console.error("Erreur lors de la récupération de la ressource:", err);
                setError(err.response?.data?.detail || err.message || "Impossible de charger la ressource.");
                setResource(null); // Assurer qu'aucune donnée précédente n'est affichée
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchResource();
        } else {
            setError("ID de ressource manquant.");
            setLoading(false);
        }
    }, [id]);

    // Détection PDF
    const isPdf = (() => {
        const ft = (resource?.file_type || '').toLowerCase();
        const fp = (resource?.file_path || '').toLowerCase();
        return ft === 'application/pdf' || fp.endsWith('.pdf');
    })();

    // Couleur du Chip selon statut
    const chipColor = (status) => {
        switch ((status || '').toLowerCase()) {
            case 'ready': return 'success';
            case 'processing': return 'info';
            case 'pending': return 'warning';
            case 'error': return 'error';
            default: return 'default';
        }
    };

    // Récupérer le statut d'extraction PDF
    const fetchDoclingStatus = async () => {
        if (!id || !isPdf) return;
        setDoclingLoading(true);
        try {
            const data = await resourceService.getPdfExtractionStatus(id);
            setDoclingStatus(data?.status || null);
            setDoclingMarkdown(data?.document_markdown || '');
            const tables = Array.isArray(data?.tables) ? data.tables : [];
            setDoclingTables(tables);
            setDoclingError(data?.docling_error || null);
        } catch (err) {
            setDoclingError(err.response?.data?.detail || err.message || "Erreur lors de la récupération du statut d'extraction PDF.");
        } finally {
            setDoclingLoading(false);
        }
    };

    // Lancer/arrêter le polling automatiquement
    useEffect(() => {
        if (!resource || !isPdf) {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            setPolling(false);
            return;
        }
        // Premier fetch immédiat
        fetchDoclingStatus();
        if (!intervalRef.current) {
            intervalRef.current = setInterval(() => {
                fetchDoclingStatus();
            }, 2500);
            setPolling(true);
        }
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            setPolling(false);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, resource?.file_path, isPdf]);

    // Stopper le polling quand terminé (ready ou error)
    useEffect(() => {
        const done = (doclingStatus || '').toLowerCase();
        if (done === 'ready' || done === 'error') {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            setPolling(false);
        }
    }, [doclingStatus]);

    // Quand l'extraction devient "ready", recharger la ressource pour récupérer docling_md_path actualisé
    useEffect(() => {
        const s = (doclingStatus || '').toLowerCase();
        if (s === 'ready' && id) {
            (async () => {
                try {
                    const latest = await resourceService.getResourceById(id);
                    setResource(latest);
                } catch (e) {
                    // journaliser silencieusement, garder l'UI fonctionnelle
                    console.warn('Impossible de rafraîchir la ressource après extraction ready:', e);
                }
            })();
        }
    }, [doclingStatus, id]);

    const handleReextract = async () => {
        if (!id || !isPdf) return;
        setDoclingError(null);
        try {
            await resourceService.reextractPdfExtraction(id, reextractOpts);
            setDoclingStatus('pending');
            // Redémarrer le polling si arrêté
            if (!intervalRef.current) {
                intervalRef.current = setInterval(() => {
                    fetchDoclingStatus();
                }, 2500);
                setPolling(true);
            }
        } catch (err) {
            setDoclingError(err.response?.data?.detail || err.message || "Erreur lors du redémarrage de l'extraction.");
        }
    };

    // Effet pour récupérer les informations de type et sous-type
    useEffect(() => {
        const fetchTypeInfo = async () => {
            if (!resource) return;
            
            setLoadingTypes(true);
            try {
                // Si nous avons un ID de type de ressource
                if (resource.type_id) {
                    const typeData = await resourceTypeService.getTypeWithSubtypes(resource.type_id);
                    setResourceType(typeData);
                }
                
                // Si nous avons un ID de sous-type de ressource
                if (resource.sub_type_id) {
                    const subtypeData = await resourceTypeService.getSubtype(resource.sub_type_id);
                    setResourceSubtype(subtypeData);
                }
            } catch (err) {
                console.error("Erreur lors de la récupération des informations de type:", err);
            } finally {
                setLoadingTypes(false);
            }
        };
        
        fetchTypeInfo();
    }, [resource]);

    useEffect(() => {
        const fetchStudyObjects = async () => {
            setLoadingStudyObjects(true);
            try {
                const objects = await resourceService.getStudyObjects(id);
                setStudyObjects(objects);
                setErrorStudyObjects(null);
            } catch (err) {
                setErrorStudyObjects(err.response?.data?.detail || err.message || "Impossible de charger les objets d'étude.");
                setStudyObjects([]);
            } finally {
                setLoadingStudyObjects(false);
            }
        };
        if (id) {
            fetchStudyObjects();
        }
    }, [id]);

    if (loading) {
        return <CircularProgress />;
    }

    if (error) {
        return (
            <Box sx={{ mt: 4 }}>
                 <Button 
                    variant="outlined" 
                    
                    onClick={() => navigate('/resources')} // Ou navigate(-1)
                    sx={{ mb: 2 }}
                >
                    Retour à la liste
                </Button>
                <Alert severity="error">{error}</Alert>
            </Box>
        );
    }

    if (!resource) {
         return (
             <Box sx={{ mt: 4 }}>
                 <Button 
                    variant="outlined" 
                    
                    onClick={() => navigate('/resources')}
                    sx={{ mb: 2 }}
                 >
                    Retour à la liste
                 </Button>
                 <Alert severity="warning">Aucune donnée à afficher pour cette ressource.</Alert>
             </Box>
         );
    }

    // Construire l'URL du fichier associé et du markdown extrait
    const fileUrl = resource.file_path
                    ? `${API_BASE_URL}/media/uploads/${resource.file_path.startsWith('/') ? resource.file_path.substring(1) : resource.file_path}`
                    : null;
    const mdUrl = resource.docling_md_path
                    ? `${API_BASE_URL}/media/uploads/${resource.docling_md_path.startsWith('/') ? resource.docling_md_path.substring(1) : resource.docling_md_path}`
                    : null;

    return (
        <Container maxWidth="md" sx={{ mt: 4 }}>
            <Card>
                <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="h4" gutterBottom>
                            {resource.title || "Détail de la Ressource"}
                        </Typography>
                        <Box>
                            <Button
                                variant="contained"
                                startIcon={<EditIcon />}
                                sx={{ mr: 1 }}
                                onClick={() => navigate(`/resources/edit/${id}`)}
                            >
                                Modifier
                            </Button>
                            <IconButton color="error">
                                <DeleteIcon />
                            </IconButton>
                        </Box>
                    </Box>
                <Divider sx={{ my: 2 }} />
                
                <Typography variant="h6">Informations Générales</Typography>
                <Typography>
                    <strong>Type:</strong> {loadingTypes ? "Chargement..." : (
                        resourceType?.value || 
                        resource.type?.value || 
                        'Non spécifié'
                    )}
                </Typography>
                <Typography>
                    <strong>Sous-Type:</strong> {loadingTypes ? "Chargement..." : (
                        resourceSubtype?.value || 
                        resource.sub_type?.value || 
                        'Non spécifié'
                    )}
                </Typography>
                <Typography><strong>Source:</strong> {resource.source_type === 'file' ? 'Fichier' : (resource.source_type === 'IA' ? 'IA' : resource.source_type)}</Typography>

                <Divider sx={{ my: 2 }} />

                {/* Section Fichiers (compacte) */}
                <Box sx={{ my: 2 }}>
                    <Typography variant="h6">Fichiers</Typography>
                    <Stack spacing={1} sx={{ my: 1 }}>
                        {/* Ligne 1: fichier associé (PDF ou autre) */}
                        {fileUrl ? (
                            <Stack direction="row" spacing={1} alignItems="center">
                                {isPdf ? <PictureAsPdfIcon color="action" /> : <InsertDriveFileIcon color="action" />}
                                <Link href={fileUrl} target="_blank" rel="noopener noreferrer">ouvrir le document</Link>
                                <OpenInNewIcon fontSize="small" color="action" />
                            </Stack>
                        ) : (
                            <Typography color="textSecondary">Aucun fichier associé.</Typography>
                        )}

                        {/* Ligne 2: Markdown + statut + actions (visible seulement pour PDF) */}
                        {isPdf && (
                            <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap' }}>
                                <DescriptionIcon color={mdUrl ? 'action' : 'disabled'} />
                                {mdUrl ? (
                                    <Link href={mdUrl} target="_blank" rel="noopener noreferrer">Ouvrir le Markdown</Link>
                                ) : (
                                    <Typography color="textSecondary">Markdown indisponible</Typography>
                                )}
                                <Chip label={`${doclingStatus || 'inconnu'}`} color={chipColor(doclingStatus)} variant="outlined" />
                                {polling && <Chip label="Polling..." size="small" />}
                                {doclingLoading && <CircularProgress size={20} />}
                                <Button variant="outlined" onClick={fetchDoclingStatus} disabled={doclingLoading}>Actualiser</Button>
                                <FormControlLabel
                                    control={<Checkbox checked={reextractOpts.force} onChange={(e) => setReextractOpts(o => ({ ...o, force: e.target.checked }))} />}
                                    label="Forcer"
                                />
                                <Button variant="contained" onClick={handleReextract} disabled={doclingLoading}>Relancer l'extraction</Button>
                            </Stack>
                        )}
                        {doclingError && <Alert severity="error" sx={{ my: 1 }}>{doclingError}</Alert>}
                    </Stack>
                </Box>

                <Typography variant="h6">Objets d'étude</Typography>
                {loadingStudyObjects ? (
                    <CircularProgress size={24} />
                ) : errorStudyObjects ? (
                    <Alert severity="error">{errorStudyObjects}</Alert>
                ) : (
                    <StudyObjectChips studyObjects={studyObjects} onClick={obj => navigate(`/study-objects/${obj.id}`)} />
                )}
                </CardContent>
            </Card>
        </Container>
    );
}

export default ResourceView;
