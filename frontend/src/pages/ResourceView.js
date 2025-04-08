import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import resourceService from '../services/resourceService'; // Ajuster le chemin si nécessaire
import { 
    Box, Typography, Paper, CircularProgress, Alert, Button, Link, Divider 
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

// Fonction pour formater les dates (peut être centralisée)
const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString('fr-FR', options);
};

// Base URL pour les fichiers statiques du backend
const STATIC_FILES_URL = 'http://localhost:10000'; // Ajustez si nécessaire

function ResourceView() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [resource, setResource] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

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

    if (loading) {
        return <CircularProgress />;
    }

    if (error) {
        return (
            <Box sx={{ mt: 4 }}>
                 <Button 
                    variant="outlined" 
                    startIcon={<ArrowBackIcon />} 
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
                    startIcon={<ArrowBackIcon />} 
                    onClick={() => navigate('/resources')}
                    sx={{ mb: 2 }}
                 >
                    Retour à la liste
                 </Button>
                 <Alert severity="warning">Aucune donnée à afficher pour cette ressource.</Alert>
             </Box>
         );
    }

    // Construire l'URL du fichier si applicable
    // Le backend doit retourner le chemin *relatif* au dossier 'static' dans file_path (ex: 'uploads/19/mon_fichier.pdf')
    const fileUrl = resource.source_type === 'file' && resource.file_path 
                    ? `${STATIC_FILES_URL}/static/${resource.file_path.startsWith('/') ? resource.file_path.substring(1) : resource.file_path}` 
                    : null;

    return (
        <Box sx={{ maxWidth: 800, margin: 'auto', mt: 4 }}>
             <Button 
                variant="outlined" 
                startIcon={<ArrowBackIcon />} 
                onClick={() => navigate('/resources')} // Navigue vers la liste principale
                sx={{ mb: 2 }}
            >
                Retour à la liste
            </Button>
            <Paper sx={{ padding: 3 }}>
                <Typography variant="h4" component="h1" gutterBottom>
                    {resource.title || "Détail de la Ressource"}
                </Typography>
                <Divider sx={{ my: 2 }} />
                
                <Typography variant="h6">Informations Générales</Typography>
                <Typography><strong>Type:</strong> {resource.resource_type?.name || 'N/A'}</Typography>
                <Typography><strong>Sous-Type:</strong> {resource.resource_sub_type?.name || 'N/A'}</Typography>
                <Typography><strong>Source:</strong> {resource.source_type === 'file' ? 'Fichier' : (resource.source_type === 'IA' ? 'IA' : resource.source_type)}</Typography>
                <Typography><strong>Créé le:</strong> {formatDate(resource.created_at)}</Typography>
                <Typography><strong>Dernière modification:</strong> {formatDate(resource.updated_at)}</Typography>

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

                {resource.source_type === 'IA' && (
                    <Box>
                        <Typography variant="h6">Contenu Généré par IA</Typography>
                        {resource.content ? (
                            <Typography component="pre" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: '#f5f5f5', p: 1, borderRadius: 1 }}>
                                {resource.content}
                            </Typography>
                        ) : (
                            <Typography color="textSecondary">Aucun contenu disponible.</Typography>
                        )}
                    </Box>
                )}

                {/* TODO: Afficher les sessions associées si nécessaire */}
                {/* resource.sessions */}

            </Paper>
        </Box>
    );
}

export default ResourceView;
