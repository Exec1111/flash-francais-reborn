import React, { useState, useEffect } from 'react';
import oeuvreService from '../../services/oeuvreService';
import {
  Box,
  Button,
  Typography,
  Grid,
  Paper,
  Divider,
  Alert
} from '@mui/material';
import { 
  Save as SaveIcon, 
  Cancel as CancelIcon
} from '@mui/icons-material';
import AIAssistantCard from './form/AIAssistantCard';
import BasicInfoSection from './form/BasicInfoSection';
import ContentSection from './form/ContentSection';
import PedagogySection from './form/PedagogySection';
import TagsSection from './form/TagsSection';

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

  // Fonctions pour gérer les thèmes
  const addTheme = (theme) => {
    setFormData(prev => ({
      ...prev,
      contenu: {
        ...prev.contenu,
        themes: [...prev.contenu.themes, theme]
      }
    }));
  };

  const removeTheme = (index) => {
    setFormData(prev => ({
      ...prev,
      contenu: {
        ...prev.contenu,
        themes: prev.contenu.themes.filter((_, i) => i !== index)
      }
    }));
  };

  // Fonctions pour gérer les mots-clés
  const addMotsCles = (motCle) => {
    setFormData(prev => ({
      ...prev,
      contenu: {
        ...prev.contenu,
        mots_cles: [...prev.contenu.mots_cles, motCle]
      }
    }));
  };

  const removeMotsCles = (index) => {
    setFormData(prev => ({
      ...prev,
      contenu: {
        ...prev.contenu,
        mots_cles: prev.contenu.mots_cles.filter((_, i) => i !== index)
      }
    }));
  };

  // Fonctions pour gérer les tags
  const addTag = (tag) => {
    setFormData(prev => ({
      ...prev,
      tags: [...prev.tags, tag]
    }));
  };

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
              <AIAssistantCard
                canUseAI={canUseAI()}
                isAIGenerating={isAIGenerating}
                aiError={aiError}
                isExpanded={isAICardExpanded}
                onToggleExpanded={() => setIsAICardExpanded(!isAICardExpanded)}
                onGenerate={handleAIGeneration}
              />
            </Grid>
          )}

          <BasicInfoSection
            formData={formData}
            onChange={handleChange}
            typesOeuvres={typesOeuvres}
          />

          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
          </Grid>

          <ContentSection
            formData={formData}
            onChange={handleChange}
            onAddTheme={addTheme}
            onRemoveTheme={removeTheme}
            onAddMotsCles={addMotsCles}
            onRemoveMotsCles={removeMotsCles}
          />

          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
          </Grid>

          <PedagogySection
            formData={formData}
            onChange={handleChange}
            niveauxScolaires={niveauxScolaires}
          />

          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
          </Grid>

          <TagsSection
            formData={formData}
            onAddTag={addTag}
            onRemoveTag={removeTag}
          />

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
