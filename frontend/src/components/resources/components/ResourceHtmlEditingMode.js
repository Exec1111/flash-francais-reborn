import React from 'react';
import {
  Box,
  Button,
  Typography,
  CircularProgress
} from '@mui/material';
import PsychologyIcon from '@mui/icons-material/Psychology';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import SaveIcon from '@mui/icons-material/Save';
import TinyHtmlEditor from '../../editors/TinyHtmlEditor';
import HtmlChatBot from '../../htmlChat/HtmlChatBot';

/**
 * Component for full-screen HTML editing mode
 */
const ResourceHtmlEditingMode = ({
  tempHtmlContent,
  setTempHtmlContent,
  showAiChat,
  setShowAiChat,
  aiLoading,
  submitting,
  handleActivateAI,
  handleSaveHtmlContent,
  handleCancelEditing,
  setAiLoading
}) => {
  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* Loading overlay for AI operations */}
      {aiLoading && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(255, 255, 255, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            borderRadius: 1
          }}
        >
          <Box sx={{ textAlign: 'center' }}>
            <CircularProgress size={60} sx={{ mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              L'IA traite votre demande...
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Veuillez patienter, ne pas modifier le contenu
            </Typography>
          </Box>
        </Box>
      )}

      {/* Header with controls */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6">Édition du contenu HTML</Typography>
        {!showAiChat && (
          <Button
            variant="outlined"
            startIcon={<PsychologyIcon />}
            onClick={handleActivateAI}
            sx={{
              color: 'primary.main',
              borderColor: 'primary.main',
              '&:hover': {
                backgroundColor: 'primary.light',
                borderColor: 'primary.dark',
              }
            }}
          >
            Activer l'IA
          </Button>
        )}
        {showAiChat && (
          <Button
            variant="text"
            startIcon={showAiChat ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            onClick={() => setShowAiChat(!showAiChat)}
            size="small"
          >
            {showAiChat ? 'Masquer' : 'Afficher'} l'assistant IA
          </Button>
        )}
        <Box sx={{ flexGrow: 1 }} />
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={handleSaveHtmlContent}
          disabled={submitting}
          color="success"
        >
          {submitting ? <CircularProgress size={24} /> : 'Sauvegarder'}
        </Button>
        <Button
          variant="outlined"
          onClick={handleCancelEditing}
          disabled={submitting}
        >
          Annuler
        </Button>
      </Box>

      {/* Main content area */}
      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Main HTML editor */}
        <Box sx={{ flex: showAiChat ? 2 : 1, mr: showAiChat ? 1 : 0 }}>
          <TinyHtmlEditor
            initialHtml={tempHtmlContent}
            onChange={setTempHtmlContent}
            disabled={aiLoading || submitting}
          />
        </Box>

        {/* AI chatbot for assistance */}
        {showAiChat && (
          <Box sx={{ flex: 1, ml: 1, borderLeft: 1, borderColor: 'divider', pl: 1 }}>
            <HtmlChatBot
              currentHtml={tempHtmlContent}
              onHtmlChange={setTempHtmlContent}
              disabled={submitting}
              onLoadingChange={setAiLoading}
            />
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default ResourceHtmlEditingMode;