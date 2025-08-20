import React from 'react';
import {
  Box,
  Typography,
  Button,
  Alert,
  Paper,
  CircularProgress,
  IconButton,
  Collapse
} from '@mui/material';
import {
  AutoAwesome as AIIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon
} from '@mui/icons-material';

const AIAssistantCard = ({
  canUseAI,
  isAIGenerating,
  aiError,
  isExpanded,
  onToggleExpanded,
  onGenerate
}) => {
  return (
    <Paper 
      elevation={1}
      sx={{ 
        mb: 2, 
        border: '1px solid', 
        borderColor: canUseAI ? 'primary.light' : 'grey.400',
        backgroundColor: canUseAI ? 'primary.50' : 'background.paper'
      }}
    >
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AIIcon sx={{ 
              color: canUseAI ? 'primary.main' : 'text.secondary', 
              fontSize: 20 
            }} />
            <Typography 
              variant="subtitle2" 
              sx={{ 
                color: canUseAI ? 'primary.main' : 'text.primary', 
                fontWeight: 500 
              }}
            >
              Assistant IA
            </Typography>
            <Typography 
              variant="caption" 
              sx={{ 
                color: canUseAI ? 'text.secondary' : 'text.primary',
                fontWeight: canUseAI ? 400 : 500
              }}
            >
              {canUseAI ? 'Prêt' : 'Titre + Auteur requis'}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button
              size="small"
              variant={canUseAI ? "contained" : "outlined"}
              startIcon={isAIGenerating ? <CircularProgress size={16} /> : <AIIcon />}
              onClick={onGenerate}
              disabled={!canUseAI || isAIGenerating}
              sx={{ fontSize: '0.75rem', py: 0.5, px: 1.5 }}
            >
              {isAIGenerating ? 'Génération...' : 'Générer'}
            </Button>
            <IconButton
              size="small"
              onClick={onToggleExpanded}
              sx={{ color: 'primary.main' }}
            >
              {isExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
            </IconButton>
          </Box>
        </Box>
        
        <Collapse in={isExpanded}>
          <Box sx={{ mt: 2 }}>
            {aiError && (
              <Alert severity="error" sx={{ mb: 2, fontSize: '0.875rem' }}>
                {aiError}
              </Alert>
            )}
            
            <Typography 
              variant="body2" 
              sx={{ 
                color: canUseAI ? 'text.secondary' : 'text.primary', 
                fontSize: '0.875rem' 
              }}
            >
              Génère automatiquement une fiche complète basée sur le titre et l'auteur.
            </Typography>
          </Box>
        </Collapse>
      </Box>
    </Paper>
  );
};

export default AIAssistantCard;
