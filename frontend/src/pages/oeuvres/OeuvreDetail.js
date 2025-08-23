import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Chip,
  Button,
  CircularProgress,
  Alert,
  Divider,
  Card,
  CardContent
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import oeuvreService from '../../services/oeuvreService';
import ResourceManagementModal from '../../components/oeuvres/ResourceManagementModal';

const OeuvreDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [oeuvre, setOeuvre] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [resourceModalOpen, setResourceModalOpen] = useState(false);

  // Charger les données de l'œuvre
  useEffect(() => {
    const loadOeuvre = async () => {
      try {
        setIsLoading(true);
        const data = await oeuvreService.getOeuvre(id);
        setOeuvre(data);
      } catch (err) {
        setError('Erreur lors du chargement de l\'œuvre');
        console.error('Erreur chargement œuvre:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      loadOeuvre();
    }
  }, [id]);

  // Supprimer l'œuvre
  const handleDelete = async () => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette œuvre ?')) {
      try {
        await oeuvreService.deleteOeuvre(id);
        navigate('/oeuvres');
      } catch (err) {
        setError('Erreur lors de la suppression de l\'œuvre');
        console.error('Erreur suppression œuvre:', err);
      }
    }
  };

  // Formater l'affichage de l'auteur
  const formatAuteur = (auteur) => {
    if (!auteur) return 'Auteur inconnu';
    const { prenom, nom, nationalite } = auteur;
    let result = '';
    if (prenom && nom) {
      result = `${prenom} ${nom}`;
    } else {
      result = nom || prenom || 'Auteur inconnu';
    }
    if (nationalite) {
      result += ` (${nationalite})`;
    }
    return result;
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !oeuvre) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error || 'Œuvre non trouvée'}</Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/oeuvres')}
          sx={{ mt: 2 }}
        >
          Retour à la liste
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* En-tête */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/oeuvres')}
            sx={{ mb: 2 }}
          >
            Retour à la liste
          </Button>
          <Typography variant="h4" component="h1" gutterBottom>
            {oeuvre.titre}
          </Typography>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {formatAuteur(oeuvre.auteur)}
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={() => setResourceModalOpen(true)}
          >
            Ressources
          </Button>
          {!oeuvre.is_public && (
            <>
              <Button
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={() => navigate(`/oeuvres/edit/${id}`)}
              >
                Modifier
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={handleDelete}
              >
                Supprimer
              </Button>
            </>
          )}
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Informations principales */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Informations générales
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  Type
                </Typography>
                <Chip label={oeuvre.type} color="primary" sx={{ mt: 0.5 }} />
              </Grid>
              
              {oeuvre.genre && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Genre
                  </Typography>
                  <Chip label={oeuvre.genre} color="secondary" sx={{ mt: 0.5 }} />
                </Grid>
              )}
              
              {oeuvre.mouvement_litteraire && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Mouvement littéraire
                  </Typography>
                  <Typography variant="body1" sx={{ mt: 0.5 }}>
                    {oeuvre.mouvement_litteraire}
                  </Typography>
                </Grid>
              )}
              
              {oeuvre.langue_originale && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Langue originale
                  </Typography>
                  <Typography variant="body1" sx={{ mt: 0.5 }}>
                    {oeuvre.langue_originale}
                  </Typography>
                </Grid>
              )}
              
              {oeuvre.date_publication && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Date de publication
                  </Typography>
                  <Typography variant="body1" sx={{ mt: 0.5 }}>
                    {oeuvre.date_publication}
                  </Typography>
                </Grid>
              )}
              
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  Type de contenu
                </Typography>
                <Chip 
                  label={oeuvre.extrait ? 'Extrait' : 'Œuvre complète'} 
                  color={oeuvre.extrait ? 'info' : 'success'}
                  sx={{ mt: 0.5 }} 
                />
              </Grid>
            </Grid>
          </Paper>

          {/* Contenu */}
          {oeuvre.contenu && (
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Contenu
              </Typography>
              
              {oeuvre.contenu.resume && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Résumé
                  </Typography>
                  <Typography variant="body1" sx={{ textAlign: 'justify' }}>
                    {oeuvre.contenu.resume}
                  </Typography>
                </Box>
              )}
              
              {oeuvre.contenu.themes && oeuvre.contenu.themes.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Thèmes
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {oeuvre.contenu.themes.map((theme, index) => (
                      <Chip key={index} label={theme} variant="outlined" />
                    ))}
                  </Box>
                </Box>
              )}
              
              {oeuvre.contenu.mots_cles && oeuvre.contenu.mots_cles.length > 0 && (
                <Box>
                  <Typography variant="subtitle1" gutterBottom>
                    Mots-clés
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {oeuvre.contenu.mots_cles.map((motCle, index) => (
                      <Chip key={index} label={motCle} size="small" />
                    ))}
                  </Box>
                </Box>
              )}
            </Paper>
          )}
        </Grid>

        {/* Sidebar */}
        <Grid item xs={12} md={4}>
          {/* Informations pédagogiques */}
          {oeuvre.pedagogie && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Informations pédagogiques
                </Typography>
                
                {oeuvre.pedagogie.niveau_mini_recommande && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Niveau minimum recommandé
                    </Typography>
                    <Chip 
                      label={oeuvre.pedagogie.niveau_mini_recommande} 
                      color="primary" 
                      size="small"
                      sx={{ mt: 0.5 }}
                    />
                  </Box>
                )}
                
                {oeuvre.pedagogie.difficulte && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Difficulté
                    </Typography>
                    <Chip 
                      label={oeuvre.pedagogie.difficulte} 
                      color={
                        oeuvre.pedagogie.difficulte === 'facile' ? 'success' :
                        oeuvre.pedagogie.difficulte === 'intermédiaire' ? 'warning' : 'error'
                      }
                      size="small"
                      sx={{ mt: 0.5 }}
                    />
                  </Box>
                )}
                
                {oeuvre.pedagogie.domaines_programme && oeuvre.pedagogie.domaines_programme.length > 0 && (
                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Domaines du programme
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      {oeuvre.pedagogie.domaines_programme.map((domaine, index) => (
                        <Typography key={index} variant="body2">
                          • {domaine}
                        </Typography>
                      ))}
                    </Box>
                  </Box>
                )}
              </CardContent>
            </Card>
          )}

          {/* Tags */}
          {oeuvre.tags && oeuvre.tags.length > 0 && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Tags
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {oeuvre.tags.map((tag, index) => (
                    <Chip key={index} label={tag} variant="outlined" size="small" />
                  ))}
                </Box>
              </CardContent>
            </Card>
          )}

          {/* Métadonnées */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Métadonnées
              </Typography>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Visibilité
                </Typography>
                <Chip 
                  label={oeuvre.is_public ? 'Publique' : 'Privée'} 
                  color={oeuvre.is_public ? 'success' : 'default'}
                  size="small"
                  sx={{ mt: 0.5 }}
                />
              </Box>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Créé par
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  {oeuvre.cree_par === 'SYSTEME' ? 'Système' : `Utilisateur ${oeuvre.cree_par}`}
                </Typography>
              </Box>
              
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Date de création
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  {new Date(oeuvre.date_creation).toLocaleDateString('fr-FR')}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <ResourceManagementModal
        open={resourceModalOpen}
        onClose={() => setResourceModalOpen(false)}
        oeuvre={oeuvre}
        onResourcesUpdated={(updatedOeuvre) => setOeuvre(updatedOeuvre)}
      />
    </Box>
  );
};

export default OeuvreDetail;
