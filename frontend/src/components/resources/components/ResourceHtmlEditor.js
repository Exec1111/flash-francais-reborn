import React from 'react';
import {
  Grid,
  Box,
  Button,
  Typography,
  Link,
  CircularProgress
} from '@mui/material';
import LinkIcon from '@mui/icons-material/Link';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import EditIcon from '@mui/icons-material/Edit';
import PsychologyIcon from '@mui/icons-material/Psychology';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import SaveIcon from '@mui/icons-material/Save';
import TinyHtmlEditor from '../../editors/TinyHtmlEditor';
import HtmlChatBot from '../../htmlChat/HtmlChatBot';

/**
 * Component for HTML editing interface
 */
const ResourceHtmlEditor = ({
  showHtmlEditor,
  isEditingMode,
  htmlContent,
  tempHtmlContent,
  setTempHtmlContent,
  showAiChat,
  setShowAiChat,
  aiLoading,
  submitting,
  handleEditContent,
  handleActivateAI,
  handleSaveHtmlContent,
  handleCancelEditing,
  setAiLoading
}) => {
  if (!showHtmlEditor) {
    return null;
  }

  if (!isEditingMode) {
    // Standard mode: show link and edit button
    return (
      <Grid item xs={12}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Typography variant="h6">Contenu HTML</Typography>
          {htmlContent && (
            <Link
              component="button"
              onClick={(e) => {
                e.preventDefault();
                const newWindow = window.open('', '_blank');
                newWindow.document.write(`
                  <!DOCTYPE html>
                  <html>
                    <head>
                      <title>Aperçu du contenu HTML</title>
                      <meta charset="utf-8">
                    </head>
                    <body>
                      ${htmlContent}
                    </body>
                  </html>
                `);
                newWindow.document.close();
              }}
              sx={{
                display: 'flex',
                alignItems: 'center',
                textDecoration: 'none',
                background: 'none',
                border: 0,
                cursor: 'pointer',
                color: 'primary.main'
              }}
            >
              <LinkIcon fontSize="small" sx={{ mr: 0.5 }} />
              Consulter le contenu
              <OpenInNewIcon fontSize="small" sx={{ ml: 0.5 }} />
            </Link>
          )}
          <Button
            variant="contained"
            startIcon={<EditIcon />}
            onClick={handleEditContent}
            sx={{
              backgroundColor: 'primary.main',
              '&:hover': {
                backgroundColor: 'primary.dark',
              }
            }}
          >
            Éditer le contenu
          </Button>
        </Box>
      </Grid>
    );
  }

  // Editing mode: show editor with controls (handled by parent for full-screen)
  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
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

      <Grid container spacing={2}>
        {/* Main HTML editor */}
        <Grid item xs={12} md={showAiChat ? 8 : 12}>
          <TinyHtmlEditor
            initialHtml={tempHtmlContent}
            onChange={setTempHtmlContent}
          />
        </Grid>

        {/* AI chatbot for assistance */}
        {showAiChat && (
          <Grid item xs={12} md={4}>
            <HtmlChatBot
              currentHtml={tempHtmlContent}
              onHtmlChange={setTempHtmlContent}
              disabled={submitting}
              onLoadingChange={setAiLoading}
            />
          </Grid>
        )}
      </Grid>
    </>
  );
};

export default ResourceHtmlEditor;