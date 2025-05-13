import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import resourceService from '../services/resourceService';
import resourceTypeService from '../services/resourceTypeService';
import { 
    Box, Typography, CircularProgress, Alert, Button, Link, Divider, List, ListItem,
    Container, Card, CardContent, IconButton, Chip
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import StudyObjectChips from '../components/studyObjects/StudyObjectChips';

// Fonction pour formater les dates (peut être centralisée)
const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString('fr-FR', options);
};

// Base URL pour l'API et les fichiers statiques du backend depuis les variables d'environnement
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:10000'; // Fallback

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

    // Construire l'URL du fichier si applicable (upload ou IA)
    const fileUrl = resource.file_path
                    ? `${API_BASE_URL}/media/uploads/${resource.file_path.startsWith('/') ? resource.file_path.substring(1) : resource.file_path}`
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

                {resource.source_type === 'file' && (
                    <Box>
                        <Typography variant="h6">Fichier Associé</Typography>
                        {fileUrl ? (
                            <Link href={fileUrl} target="_blank" rel="noopener noreferrer">
                                Ouvrir le fichier ({resource.file_path.split('/').pop()}) {/* Affiche juste le nom du fichier */}
                            </Link>
                        ) : (
                            <Typography color="textSecondary">Aucun fichier associé ou chemin invalide.</Typography>
                        )}
                    </Box>
                )}

                {resource.source_type.toLowerCase() === 'ai' && (
                    <Box>
                        <Typography variant="h6">Fichier généré par IA</Typography>
                        {fileUrl ? (
                            <Link href={fileUrl} target="_blank" rel="noopener noreferrer">
                                Ouvrir le fichier généré ({resource.file_path.split('/').pop()})
                            </Link>
                        ) : (
                            <Typography color="textSecondary">Aucun fichier généré disponible.</Typography>
                        )}
                    </Box>
                )}

                <Divider sx={{ my: 2 }} />

                <Typography variant="h6">Objets d'étude associés</Typography>
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
