import React, { useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  CircularProgress, 
  Alert, 
  Paper, 
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import { 
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon
} from '@mui/icons-material';

/**
 * Composant pour l'étape de génération avec l'IA
 * 
 * @param {Object} props - Propriétés du composant
 * @param {Function} props.onSubmit - Fonction pour soumettre le formulaire
 * @param {boolean} props.isLoading - Indicateur de chargement
 * @param {Array} props.progress - Progression de la génération
 * @param {Function} props.onPrev - Fonction pour revenir à l'étape précédente
 * @param {Function} props.onNext - Fonction pour passer à l'étape suivante
 * @param {boolean} props.canProceed - Si l'utilisateur peut passer à l'étape suivante
 * @returns {JSX.Element} Composant React
 */
const GenerationStep = ({
  onSubmit,
  isLoading,
  progress = [],
  onPrev,
  onNext,
  canProceed = false
}) => {
  // Déclencher automatiquement la génération au chargement du composant
  useEffect(() => {
    // Vérifier si la génération n'a pas déjà été lancée
    if (progress.length === 0 && !isLoading) {
      console.log("Déclenchement automatique de la génération depuis GenerationStep");
      // Petit délai pour éviter les problèmes d'interface
      const timer = setTimeout(() => {
        onSubmit();
      }, 100);
      
      // Nettoyer le timer si le composant est démonté avant exécution
      return () => clearTimeout(timer);
    }
  }, [progress.length, isLoading, onSubmit]);  // Dépendances correctes pour éviter les exécutions multiples
  // Fonction pour afficher l'icône appropriée selon le statut
  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return <CheckCircleIcon color="success" />;
      case 'error':
        return <ErrorIcon color="error" />;
      case 'info':
      default:
        return <InfoIcon color="info" />;
    }
  };

  // Fonction pour formater l'horodatage
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
  };

  // Vérifier si la génération est terminée avec succès
  const isGenerationSuccessful = progress.some(item => 
    item.status === 'success' && item.message.includes("Génération réussie")
  );

  return (
    <Box sx={{ mt: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Génération de contenu
      </Typography>
      
      <Typography variant="body2" color="textSecondary" paragraph>
        {isGenerationSuccessful 
          ? "La génération a été effectuée avec succès. Vous pouvez passer à l'étape suivante."
          : "Cliquez sur le bouton \"Générer\" pour lancer la génération de contenu avec l'IA."}
      </Typography>
      
      <Box sx={{ mb: 3 }}>
        <Button
          variant="contained"
          color="primary"
          onClick={onSubmit}
          disabled={isLoading || isGenerationSuccessful}
          sx={{ mr: 1 }}
        >
          {isLoading ? (
            <>
              <CircularProgress size={24} sx={{ mr: 1 }} />
              Génération en cours...
            </>
          ) : (
            'Générer'
          )}
        </Button>
        
        <Button
          variant="outlined"
          onClick={onPrev}
          disabled={isLoading}
          sx={{ mr: 1 }}
        >
          Retour à la configuration
        </Button>
        
        {canProceed && (
          <Button
            variant="contained"
            color="secondary"
            onClick={onNext}
            disabled={isLoading || !canProceed}
          >
            Passer à l'édition
          </Button>
        )}
      </Box>
      
      {/* Affichage de la progression */}
      {progress.length > 0 && (
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            Progression de la génération
          </Typography>
          
          <Divider sx={{ mb: 1 }} />
          
          <List dense>
            {progress.map((item, index) => (
              <ListItem key={index}>
                <ListItemIcon>
                  {getStatusIcon(item.status)}
                </ListItemIcon>
                <ListItemText 
                  primary={item.message}
                  secondary={formatTimestamp(item.timestamp)}
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      )}
      
      {/* Message d'aide pendant le chargement */}
      {isLoading && (
        <Alert severity="info" sx={{ mt: 2 }}>
          La génération peut prendre jusqu'à une minute. Veuillez patienter...
        </Alert>
      )}
    </Box>
  );
};

export default GenerationStep;
