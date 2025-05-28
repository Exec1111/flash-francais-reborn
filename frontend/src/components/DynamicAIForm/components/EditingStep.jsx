import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  TextField, 
  Tabs, 
  Tab, 
  Paper, 
  CircularProgress,
  Divider,
  Grid,
  Switch,
  FormControlLabel
} from '@mui/material';
import StructuredEditor from './StructuredEditor';

/**
 * Composant pour l'étape d'édition des résultats générés
 * 
 * @param {Object} props - Propriétés du composant
 * @param {Array} props.editedResults - Résultats édités
 * @param {number} props.currentEditIndex - Index du résultat en cours d'édition
 * @param {Function} props.onEditorChange - Fonction pour gérer les changements d'édition
 * @param {Function} props.onPrevResult - Fonction pour passer au résultat précédent
 * @param {Function} props.onNextResult - Fonction pour passer au résultat suivant
 * @param {Function} props.onPrev - Fonction pour revenir à l'étape précédente
 * @param {Function} props.onNext - Fonction pour passer à l'étape suivante
 * @param {boolean} props.isLoading - Indicateur de chargement
 * @returns {JSX.Element} Composant React
 */
const EditingStep = ({
  editedResults = [],
  currentEditIndex = 0,
  onEditorChange,
  onPrevResult,
  onNextResult,
  onPrev,
  onNext,
  isLoading
}) => {
  // Déclaration de tous les hooks au début du composant
  // État pour basculer entre les modes d'édition
  const [useStructuredEditor, setUseStructuredEditor] = useState(true);
  
  // Gestionnaire de changement d'onglet
  const handleTabChange = (event, newValue) => {
    // Si c'est un index valide
    if (newValue >= 0 && newValue < editedResults.length) {
      onPrevResult();
    }
  };

  // Logique conditionnelle après déclaration des hooks
  // Si aucun résultat n'est disponible
  if (editedResults.length === 0) {
    return (
      <Box sx={{ mt: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Édition des résultats
        </Typography>
        
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Typography variant="body1" gutterBottom>
            Aucun résultat généré à éditer. Veuillez d'abord générer du contenu.
          </Typography>
          
          <Button
            variant="outlined"
            onClick={onPrev}
            sx={{ mt: 2 }}
          >
            Retour à la génération
          </Button>
        </Paper>
      </Box>
    );
  }
  
  // Récupérer le résultat actuel
  const currentResult = editedResults[currentEditIndex];
  
  // Détermine si le résultat est un objet ou une chaîne
  const isObjectResult = typeof currentResult === 'object' && currentResult !== null;

  return (
    <Box sx={{ mt: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Édition des résultats
      </Typography>
      
      {/* Navigation entre les résultats si plusieurs */}
      {editedResults.length > 1 && (
        <Paper sx={{ mb: 2 }}>
          <Tabs
            value={currentEditIndex}
            onChange={handleTabChange}
            indicatorColor="primary"
            textColor="primary"
            variant="scrollable"
            scrollButtons="auto"
          >
            {editedResults.map((_, index) => (
              <Tab 
                key={index} 
                label={`Résultat ${index + 1}`} 
                onClick={() => onEditorChange(index)}
              />
            ))}
          </Tabs>
        </Paper>
      )}
      
      {/* Options d'édition */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <FormControlLabel
          control={
            <Switch
              checked={useStructuredEditor}
              onChange={(e) => setUseStructuredEditor(e.target.checked)}
              color="primary"
            />
          }
          label="Éditeur structuré"
        />
      </Box>
      
      {/* Éditeur pour le résultat actuel */}
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" gutterBottom>
          Éditeur de contenu
        </Typography>
        
        <Divider sx={{ mb: 2 }} />
        
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : isObjectResult ? (
          useStructuredEditor ? (
            // Éditeur structuré pour les objets complexes
            <StructuredEditor
              data={currentResult}
              onChange={(updatedData) => onEditorChange(currentEditIndex, updatedData)}
              title="Édition des données structurées"
              allowRawEdit={true}
            />
          ) : (
            // Éditeur basique pour les objets (mode texte)
            <TextField
              fullWidth
              value={JSON.stringify(currentResult, null, 2)}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  onEditorChange(currentEditIndex, parsed);
                } catch (error) {
                  // Ne rien faire en cas d'erreur de parsing
                }
              }}
              multiline
              rows={12}
              variant="outlined"
              sx={{ fontFamily: 'monospace' }}
            />
          )
        ) : (
          // Éditeur pour les résultats de type chaîne
          <TextField
            fullWidth
            value={currentResult || ''}
            onChange={(e) => onEditorChange(currentEditIndex, e.target.value)}
            multiline
            rows={8}
            variant="outlined"
          />
        )}
        
        {/* Boutons de navigation entre les résultats */}
        {editedResults.length > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <Button
              variant="outlined"
              onClick={onPrevResult}
              disabled={currentEditIndex === 0 || isLoading}
              sx={{ mr: 1 }}
            >
              Résultat précédent
            </Button>
            
            <Button
              variant="outlined"
              onClick={onNextResult}
              disabled={currentEditIndex === editedResults.length - 1 || isLoading}
            >
              Résultat suivant
            </Button>
          </Box>
        )}
      </Paper>
      
      {/* Boutons de navigation entre les étapes */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
        <Button
          variant="outlined"
          onClick={onPrev}
          disabled={isLoading}
        >
          Retour à la génération
        </Button>
        
        <Button
          variant="contained"
          color="primary"
          onClick={onNext}
          disabled={isLoading}
        >
          Continuer vers la fusion
        </Button>
      </Box>
    </Box>
  );
};

export default EditingStep;
