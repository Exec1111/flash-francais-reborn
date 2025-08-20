import React, { useState, useEffect } from 'react';
import oeuvreService from '../../services/oeuvreService';
import {
  Box,
  TextField,
  Button,
  Typography,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Chip,
  Paper,
  Divider,
  Alert,
  Card,
  CardContent,
  CircularProgress,
  IconButton
} from '@mui/material';
import { 
  Save as SaveIcon, 
  Cancel as CancelIcon,
  AutoAwesome as AIIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon
} from '@mui/icons-material';

const OeuvreForm = ({ 
  initialData = null, 
  onSubmit, 
  onCancel, 
  isLoading = false,
  error = null 
}) => {
  const [formData, setFormData] = useState({
    titre: '',
    auteur: {
      nom: '',
      prenom: '',
      nationalite: ''
    },
    type: '',
    genre: '',
    mouvement_litteraire: '',
    langue_originale: '',
    date_publication: '',
    extrait: false,
    contenu: {
      resume: '',
      themes: [],
      mots_cles: []
    },
    pedagogie: {
      niveau_mini_recommande: '',
      domaines_programme: [],
      difficulte: ''
    },
    tags: []
  });

  const [newTheme, setNewTheme] = useState('');
  const [newMotCle, setNewMotCle] = useState('');
  const [newDomaineProgram, setNewDomaineProgram] = useState('');
  const [newTag, setNewTag] = useState('');
  
  // États pour la génération IA
  const [isAIGenerating, setIsAIGenerating] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [showAICard, setShowAICard] = useState(false);
  const [isAICardExpanded, setIsAICardExpanded] = useState(true);

  // Types d'œuvres disponibles
  const typesOeuvres = [
    'roman', 'nouvelle', 'poème', 'théâtre', 'essai', 'discours', 'BD', 'conte', 'fable'
  ];

  // Niveaux scolaires
  const niveauxScolaires = [
    '6e', '5e', '4e', '3e', '2nde', '1re', 'Terminale'
  ];

  // Niveaux de difficulté
  const niveauxDifficulte = [
    'facile', 'intermédiaire', 'difficile'
  ];

  // Initialiser le formulaire avec les données existantes
  useEffect(() => {
    if (initialData) {
      setFormData({
        titre: initialData.titre || '',
        auteur: {
          nom: initialData.auteur?.nom || '',
          prenom: initialData.auteur?.prenom || '',
          nationalite: initialData.auteur?.nationalite || ''
        },
        type: initialData.type || '',
        genre: initialData.genre || '',
        mouvement_litteraire: initialData.mouvement_litteraire || '',
        langue_originale: initialData.langue_originale || '',
        date_publication: initialData.date_publication || '',
        extrait: initialData.extrait || false,
        contenu: {
          resume: initialData.contenu?.resume || '',
          themes: initialData.contenu?.themes || [],
          mots_cles: initialData.contenu?.mots_cles || []
        },
        pedagogie: {
          niveau_mini_recommande: initialData.pedagogie?.niveau_mini_recommande || '',
          domaines_programme: initialData.pedagogie?.domaines_programme || [],
          difficulte: initialData.pedagogie?.difficulte || ''
        },
        tags: initialData.tags || []
      });
    }
  }, [initialData]);

  // Vérifier si les champs minimum pour l'IA sont remplis
  const canUseAI = () => {
    return formData.titre.trim() && 
           formData.auteur.nom.trim() && 
           formData.auteur.prenom.trim();
  };

  // Afficher la carte IA en mode création et modification si les champs requis sont remplis
  useEffect(() => {
    if (!initialData) {
      // Mode création : toujours visible
      setShowAICard(true);
    } else {
      // Mode modification : visible si les champs requis sont remplis
      setShowAICard(canUseAI());
    }
  }, [initialData, formData.titre, formData.auteur.nom, formData.auteur.prenom]);

  // Fonction de génération IA (placeholder)
  const handleAIGeneration = async () => {
    if (!canUseAI()) return;
    
    setIsAIGenerating(true);
    
    try {
      // Préparer les données pour la génération IA
      const generateData = {
        titre: formData.titre,
        auteur_prenom: formData.auteur.prenom,
        auteur_nom: formData.auteur.nom,
        type_prefere: formData.type || '',
        niveau_cible: '3e', // Valeur par défaut
        extrait: false
      };
      
      // Appeler l'API de génération IA
      const generatedOeuvre = await oeuvreService.generateOeuvreAI(generateData);
      
      // Remplir le formulaire avec les données générées
      setFormData({
        ...formData,
        titre: generatedOeuvre.titre || formData.titre,
        auteur: {
          nom: generatedOeuvre.auteur?.nom || formData.auteur.nom,
          prenom: generatedOeuvre.auteur?.prenom || formData.auteur.prenom,
          nationalite: generatedOeuvre.auteur?.nationalite || formData.auteur.nationalite
        },
        type: generatedOeuvre.type || formData.type,
        genre: generatedOeuvre.genre || formData.genre,
        mouvement_litteraire: generatedOeuvre.mouvement_litteraire || formData.mouvement_litteraire,
        langue_originale: generatedOeuvre.langue_originale || formData.langue_originale,
        date_publication: generatedOeuvre.date_publication || formData.date_publication,
        extrait: generatedOeuvre.extrait || formData.extrait,
        contenu: {
          resume: generatedOeuvre.contenu?.resume || formData.contenu.resume,
          themes: generatedOeuvre.contenu?.themes || formData.contenu.themes,
          mots_cles: generatedOeuvre.contenu?.mots_cles || formData.contenu.mots_cles
        },
        pedagogie: {
          niveau_mini_recommande: generatedOeuvre.pedagogie?.niveau_mini_recommande || formData.pedagogie.niveau_mini_recommande,
          domaines_programme: generatedOeuvre.pedagogie?.domaines_programme || formData.pedagogie.domaines_programme,
          difficulte: generatedOeuvre.pedagogie?.difficulte || formData.pedagogie.difficulte
        },
        tags: generatedOeuvre.tags || formData.tags
      });
      
    } catch (error) {
      setAiError('Erreur lors de la génération IA: ' + (error.response?.data?.detail || error.message));
      console.error('Erreur génération IA:', error);
    } finally {
      setIsAIGenerating(false);
    }
  };

  // Gérer les changements de champs simples
  const handleChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  // Ajouter un élément à un tableau
  const addToArray = (field, value, setterFunction) => {
    if (value.trim()) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: [...prev[parent][child], value.trim()]
        }
      }));
      setterFunction('');
    }
  };

  // Supprimer un élément d'un tableau
  const removeFromArray = (field, index) => {
    const [parent, child] = field.split('.');
    setFormData(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent],
        [child]: prev[parent][child].filter((_, i) => i !== index)
      }
    }));
  };

  // Ajouter un tag
  const addTag = () => {
    if (newTag.trim()) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  // Supprimer un tag
  const removeTag = (index) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter((_, i) => i !== index)
    }));
  };

  // Gérer la soumission du formulaire
  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Paper elevation={3} sx={{ p: 3, maxWidth: 1000, mx: 'auto' }}>
      <Typography variant="h5" gutterBottom>
        {initialData ? 'Modifier l\'œuvre' : 'Nouvelle œuvre'}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          {showAICard && (
            <Grid item xs={12}>
              <Card 
                sx={{ 
                  mb: 3, 
                  border: '2px solid', 
                  borderColor: canUseAI() ? 'primary.main' : 'grey.300',
                  background: canUseAI() 
                    ? 'linear-gradient(45deg, #e3f2fd 30%, #f3e5f5 90%)'
                    : 'linear-gradient(45deg, #f5f5f5 30%, #fafafa 90%)'
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <AIIcon sx={{ color: 'primary.main', fontSize: 28 }} />
                      <Typography variant="h6" sx={{ color: 'primary.main', fontWeight: 600 }}>
                        Assistant IA pour les œuvres
                      </Typography>
                    </Box>
                    <IconButton
                      onClick={() => setIsAICardExpanded(!isAICardExpanded)}
                      sx={{ color: 'primary.main' }}
                    >
                      {isAICardExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </IconButton>
                  </Box>
                  
                  {isAICardExpanded && (
                    <>
                      {aiError && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                          {aiError}
                        </Alert>
                      )}
                      
                      <Typography variant="body1" sx={{ mb: 2, color: 'text.primary' }}>
                        L'IA peut générer automatiquement une fiche complète d'œuvre littéraire 
                        en se basant sur le titre et l'auteur que vous avez saisis.
                      </Typography>
                      
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Button
                          variant="contained"
                          startIcon={isAIGenerating ? <CircularProgress size={20} /> : <AIIcon />}
                          onClick={handleAIGeneration}
                          disabled={!canUseAI() || isAIGenerating}
                          sx={{ 
                            bgcolor: 'primary.main',
                            '&:hover': { bgcolor: 'primary.dark' },
                            fontWeight: 600
                          }}
                        >
                          {isAIGenerating ? 'Génération en cours...' : 'Générer avec l\'IA'}
                        </Button>
                        
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            color: canUseAI() ? 'primary.main' : 'text.secondary',
                            fontWeight: canUseAI() ? 500 : 400,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5
                          }}
                        >
                          {canUseAI() ? '✨' : '⚠️'} 
                          {canUseAI() 
                            ? 'Remplissage automatique intelligent'
                            : 'Champs requis : Titre + Nom + Prénom auteur'
                          }
                        </Typography>
                      </Box>
                    </>
                  )}
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Informations de base */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Informations générales
            </Typography>
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Titre de l'œuvre"
              value={formData.titre}
              onChange={(e) => handleChange('titre', e.target.value)}
              required
            />
          </Grid>

          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Nom de l'auteur"
              value={formData.auteur.nom}
              onChange={(e) => handleChange('auteur.nom', e.target.value)}
              required
            />
          </Grid>

          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Prénom de l'auteur"
              value={formData.auteur.prenom}
              onChange={(e) => handleChange('auteur.prenom', e.target.value)}
              required
            />
          </Grid>

          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Nationalité de l'auteur"
              value={formData.auteur.nationalite}
              onChange={(e) => handleChange('auteur.nationalite', e.target.value)}
              required
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth required>
              <InputLabel>Type d'œuvre</InputLabel>
              <Select
                value={formData.type}
                onChange={(e) => handleChange('type', e.target.value)}
                label="Type d'œuvre"
              >
                {typesOeuvres.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Genre littéraire"
              value={formData.genre}
              onChange={(e) => handleChange('genre', e.target.value)}
              helperText="Ex: tragédie, comédie, épique, lyrique, fantastique, policier..."
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Mouvement littéraire"
              value={formData.mouvement_litteraire}
              onChange={(e) => handleChange('mouvement_litteraire', e.target.value)}
              helperText="Ex: romantisme, réalisme, classicisme, surréalisme, nouveau roman..."
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Langue originale"
              value={formData.langue_originale}
              onChange={(e) => handleChange('langue_originale', e.target.value)}
              helperText="Ex: français, anglais, espagnol, latin, grec ancien..."
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Année de publication"
              type="number"
              value={formData.date_publication}
              onChange={(e) => handleChange('date_publication', parseInt(e.target.value) || '')}
              helperText="Année de première publication de l'œuvre"
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.extrait}
                  onChange={(e) => handleChange('extrait', e.target.checked)}
                />
              }
              label="Il s'agit d'un extrait (cochez si vous ne saisissez qu'une partie de l'œuvre)"
            />
          </Grid>

          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
            <Typography variant="h6" gutterBottom>
              Contenu
            </Typography>
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Résumé"
              value={formData.contenu.resume}
              onChange={(e) => handleChange('contenu.resume', e.target.value)}
              helperText="Résumé de l'intrigue, du contenu ou des idées principales de l'œuvre"
            />
          </Grid>

          {/* Thèmes */}
          <Grid item xs={12}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Thèmes
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Thèmes principaux abordés dans l'œuvre (ex: amour, mort, guerre, justice, liberté...)
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                {formData.contenu.themes.map((theme, index) => (
                  <Chip
                    key={index}
                    label={theme}
                    onDelete={() => removeFromArray('contenu.themes', index)}
                  />
                ))}
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  size="small"
                  label="Nouveau thème"
                  value={newTheme}
                  onChange={(e) => setNewTheme(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addToArray('contenu.themes', newTheme, setNewTheme);
                    }
                  }}
                />
                <Button
                  variant="outlined"
                  onClick={() => addToArray('contenu.themes', newTheme, setNewTheme)}
                >
                  Ajouter
                </Button>
              </Box>
            </Box>
          </Grid>

          {/* Mots-clés */}
          <Grid item xs={12}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Mots-clés
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Mots-clés pour faciliter la recherche (personnages, lieux, concepts importants...)
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                {formData.contenu.mots_cles.map((motCle, index) => (
                  <Chip
                    key={index}
                    label={motCle}
                    onDelete={() => removeFromArray('contenu.mots_cles', index)}
                  />
                ))}
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  size="small"
                  label="Nouveau mot-clé"
                  value={newMotCle}
                  onChange={(e) => setNewMotCle(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addToArray('contenu.mots_cles', newMotCle, setNewMotCle);
                    }
                  }}
                />
                <Button
                  variant="outlined"
                  onClick={() => addToArray('contenu.mots_cles', newMotCle, setNewMotCle)}
                >
                  Ajouter
                </Button>
              </Box>
            </Box>
          </Grid>

          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
            <Typography variant="h6" gutterBottom>
              Pédagogie
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Niveau minimum recommandé</InputLabel>
              <Select
                value={formData.pedagogie.niveau_mini_recommande}
                onChange={(e) => handleChange('pedagogie.niveau_mini_recommande', e.target.value)}
                label="Niveau minimum recommandé"
              >
                {niveauxScolaires.map((niveau) => (
                  <MenuItem key={niveau} value={niveau}>
                    {niveau}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Difficulté</InputLabel>
              <Select
                value={formData.pedagogie.difficulte}
                onChange={(e) => handleChange('pedagogie.difficulte', e.target.value)}
                label="Difficulté"
              >
                {niveauxDifficulte.map((difficulte) => (
                  <MenuItem key={difficulte} value={difficulte}>
                    {difficulte}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Domaines du programme */}
          <Grid item xs={12}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Domaines du programme
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Domaines du programme scolaire concernés (ex: "Étude de la langue", "Lecture et compréhension", "Expression écrite"...)
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                {formData.pedagogie.domaines_programme.map((domaine, index) => (
                  <Chip
                    key={index}
                    label={domaine}
                    onDelete={() => removeFromArray('pedagogie.domaines_programme', index)}
                  />
                ))}
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  size="small"
                  label="Nouveau domaine"
                  value={newDomaineProgram}
                  onChange={(e) => setNewDomaineProgram(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addToArray('pedagogie.domaines_programme', newDomaineProgram, setNewDomaineProgram);
                    }
                  }}
                />
                <Button
                  variant="outlined"
                  onClick={() => addToArray('pedagogie.domaines_programme', newDomaineProgram, setNewDomaineProgram)}
                >
                  Ajouter
                </Button>
              </Box>
            </Box>
          </Grid>

          {/* Tags */}
          <Grid item xs={12}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Tags
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Étiquettes libres pour organiser vos œuvres (ex: "bac français", "lecture cursive", "analyse littéraire"...)
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                {formData.tags.map((tag, index) => (
                  <Chip
                    key={index}
                    label={tag}
                    onDelete={() => removeTag(index)}
                  />
                ))}
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  size="small"
                  label="Nouveau tag"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                />
                <Button
                  variant="outlined"
                  onClick={addTag}
                >
                  Ajouter
                </Button>
              </Box>
            </Box>
          </Grid>

          {/* Boutons d'action */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 3 }}>
              <Button
                variant="outlined"
                startIcon={<CancelIcon />}
                onClick={onCancel}
                disabled={isLoading}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                variant="contained"
                startIcon={<SaveIcon />}
                disabled={isLoading}
              >
                {isLoading ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </form>
    </Paper>
  );
};

export default OeuvreForm;
