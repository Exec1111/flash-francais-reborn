import React, { useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Paper, 
  Divider,
  CircularProgress,
  Alert,
  Link
} from '@mui/material';
import { Launch as LaunchIcon } from '@mui/icons-material';

/**
 * Composant pour l'étape de fusion des résultats
 * 
 * @param {Object} props - Propriétés du composant
 * @param {Object} props.mergedResults - Résultats fusionnés
 * @param {Function} props.onMergeAll - Fonction pour fusionner tous les résultats
 * @param {Function} props.onFinish - Fonction pour finaliser et enregistrer la ressource
 * @param {Function} props.onPrev - Fonction pour revenir à l'étape précédente
 * @param {boolean} props.isLoading - Indicateur de chargement
 * @param {boolean} props.mergeSuccess - Si la fusion a réussi
 * @param {string} props.localHtmlContent - Contenu HTML local pour prévisualisation
 * @param {Function} props.setLocalHtmlContent - Fonction pour modifier le contenu HTML local
 * @returns {JSX.Element} Composant React
 */
const MergeStep = ({
  mergedResults,
  onMergeAll,
  onFinish,
  onPrev,
  isLoading,
  mergeSuccess,
  localHtmlContent,
  setLocalHtmlContent
}) => {
  // Déclencher automatiquement la fusion au chargement du composant
  useEffect(() => {
    // Vérifier si la fusion n'a pas déjà été lancée ou réussie
    if (!mergeSuccess && !isLoading) {
      console.log("Déclenchement automatique de la fusion depuis MergeStep");
      // Petit délai pour éviter les problèmes d'interface
      const timer = setTimeout(() => {
        onMergeAll();
      }, 300);
      
      // Nettoyer le timer si le composant est démonté avant exécution
      return () => clearTimeout(timer);
    }
  }, [mergeSuccess, isLoading, onMergeAll]); // Dépendances pour éviter les exécutions multiples
  // Fonction pour traiter le contenu HTML pour prévisualisation
  const sanitizeHtml = (html) => {
    // Implémenter une logique de nettoyage/sanitisation du HTML si nécessaire
    return html;
  };

  // Récupérer l'URL de prévisualisation HTML depuis les résultats fusionnés
  const htmlPreviewUrl = mergedResults?.html_url || null;

  return (
    <Box sx={{ mt: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Fusion et finalisation
      </Typography>
      
      <Typography variant="body2" color="textSecondary" paragraph>
        Dans cette étape, la fusion des résultats générés en un seul document final se fait automatiquement.
        Une fois la fusion terminée, vous pourrez prévisualiser le document et finaliser la ressource.
      </Typography>
      
      {/* Boutons d'action */}
      <Box sx={{ mb: 3 }}>
        <Button
          variant="contained"
          color="primary"
          onClick={onMergeAll}
          disabled={isLoading || mergeSuccess}
          sx={{ mr: 1 }}
        >
          {isLoading ? (
            <>
              <CircularProgress size={24} sx={{ mr: 1 }} />
              Fusion en cours...
            </>
          ) : (
            'Fusionner les résultats'
          )}
        </Button>
        
        <Button
          variant="outlined"
          onClick={onPrev}
          disabled={isLoading}
          sx={{ mr: 1 }}
        >
          Retour à l'édition
        </Button>
        
        {mergeSuccess && htmlPreviewUrl && (
          <Button
            variant="outlined"
            color="primary"
            component="a"
            href={htmlPreviewUrl}
            target="_blank"
            rel="noopener noreferrer"
            startIcon={<LaunchIcon />}
            sx={{ mr: 1 }}
            disabled={isLoading}
          >
            Voir l'aperçu du document
          </Button>
        )}
        
        <Button
          variant="contained"
          color="success"
          onClick={onFinish}
          disabled={isLoading || !mergeSuccess}
        >
          Finaliser la ressource
        </Button>
      </Box>
      
      {/* Affichage de statut */}
      {mergeSuccess && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Fusion réussie ! Vous pouvez maintenant prévisualiser et finaliser la ressource.
        </Alert>
      )}
      
      {/* Le bouton de prévisualisation a été déplacé dans les boutons d'action */}
      
      {/* Message d'attente pendant la fusion automatique */}
      {!mergeSuccess && !isLoading && (
        <Alert severity="info" sx={{ mt: 2 }}>
          La fusion des résultats va démarrer automatiquement...
        </Alert>
      )}
    </Box>
  );
};

export default MergeStep;
