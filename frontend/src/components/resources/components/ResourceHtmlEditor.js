import React, { useState, useRef } from 'react';
import {
  Grid,
  Box,
  Button,
  Typography,
  Link,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert
} from '@mui/material';
import LinkIcon from '@mui/icons-material/Link';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import EditIcon from '@mui/icons-material/Edit';
import PsychologyIcon from '@mui/icons-material/Psychology';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import SaveIcon from '@mui/icons-material/Save';
import SaveAsIcon from '@mui/icons-material/SaveAs';
import TinyHtmlEditor from '../../editors/TinyHtmlEditor';
import HtmlChatBot from '../../htmlChat/HtmlChatBot';
import { API_BASE_URL } from '../../../services/api';

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
  handleSaveAsHtmlContent,
  handleCancelEditing,
  setAiLoading,
  initialData
}) => {
  // State for Save As dialog
  const [saveAsDialogOpen, setSaveAsDialogOpen] = useState(false);
  const [newResourceName, setNewResourceName] = useState('');
  const [saveAsSubmitting, setSaveAsSubmitting] = useState(false);

  // Ref to access TinyHtmlEditor methods directly
  const editorRef = useRef(null);

  // Debug logging for "Consulter le contenu" button visibility
  console.log('[DEBUG ResourceHtmlEditor] Conditions check:', {
    showHtmlEditor,
    isEditingMode,
    htmlContent: htmlContent ? `${htmlContent.length} caractères` : 'vide',
    htmlContentTrimmed: htmlContent && htmlContent.trim() ? `${htmlContent.trim().length} caractères trimmed` : 'vide après trim'
  });

  if (!showHtmlEditor) {
    console.log('[DEBUG ResourceHtmlEditor] showHtmlEditor est false, composant masqué');
    return null;
  }

  if (!isEditingMode) {
    // Standard mode: show link and edit button
    return (
      <Grid item xs={12}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Typography variant="h6">Contenu HTML</Typography>
          <Link
            component="button"
            onClick={(e) => {
              e.preventDefault();
              
              // Build the URL to the HTML document using the same logic as ResourceView.js
              const relativeUrlRaw = initialData?.html_url || initialData?.html_content_url || 
                                     initialData?.file_path || initialData?.url;
              
              if (relativeUrlRaw) {
                const relativeUrl = relativeUrlRaw.replace(/\\/g, '/');
                let fullUrl;
                
                if (relativeUrl.startsWith('http')) {
                  fullUrl = relativeUrl;
                } else {
                  // Use the same URL construction pattern as ResourceView.js
                  const cleanPath = relativeUrl.startsWith('/') ? relativeUrl.substring(1) : relativeUrl;
                  fullUrl = `${API_BASE_URL}/media/uploads/${cleanPath}`;
                }
                
                // Open in new tab
                window.open(fullUrl, '_blank');
              } else {
                alert('Aucun document HTML trouvé pour cette ressource.');
              }
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
      {/* Blocking overlay during Save As operation */}
      {saveAsSubmitting && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(255, 255, 255, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            borderRadius: 1
          }}
        >
          <Box sx={{ textAlign: 'center' }}>
            <CircularProgress size={60} sx={{ mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              Sauvegarde en cours...
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Création de la nouvelle ressource
            </Typography>
          </Box>
        </Box>
      )}

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
          onClick={async () => {
            const resourceService = await import('../../../services/resourceService');
            await handleSaveHtmlContent(resourceService.default);
          }}
          disabled={submitting}
          color="success"
        >
          {submitting ? <CircularProgress size={24} /> : 'Sauvegarder'}
        </Button>
        <Button
          variant="outlined"
          startIcon={<SaveAsIcon />}
          onClick={() => {
            setNewResourceName(initialData?.title ? `${initialData.title} (copie)` : 'Nouvelle ressource');
            setSaveAsDialogOpen(true);
          }}
          disabled={submitting || saveAsSubmitting}
          color="primary"
        >
          Sauvegarder sous
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
            ref={editorRef}
            initialHtml={tempHtmlContent}
            onChange={setTempHtmlContent}
          />
        </Grid>

        {/* AI chatbot for assistance */}
        {showAiChat && (
          <Grid item xs={12} md={4}>
            <HtmlChatBot
              currentHtml={tempHtmlContent}
              onHtmlChange={(newHtml) => {
                // Use direct editor update instead of prop change
                if (editorRef.current) {
                  editorRef.current.updateContent(newHtml);
                }
                setTempHtmlContent(newHtml);
              }}
              disabled={submitting}
              onLoadingChange={setAiLoading}
            />
          </Grid>
        )}
      </Grid>
      
      {/* Save As Dialog */}
      <Dialog
        open={saveAsDialogOpen}
        onClose={() => !saveAsSubmitting && setSaveAsDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Sauvegarder sous</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Nom de la nouvelle ressource"
            fullWidth
            variant="outlined"
            value={newResourceName}
            onChange={(e) => setNewResourceName(e.target.value)}
            disabled={saveAsSubmitting}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setSaveAsDialogOpen(false)}
            disabled={saveAsSubmitting}
          >
            Annuler
          </Button>
          <Button
            onClick={async () => {
              if (newResourceName.trim() && handleSaveAsHtmlContent) {
                setSaveAsSubmitting(true);
                try {
                  await handleSaveAsHtmlContent(newResourceName.trim());
                  setSaveAsDialogOpen(false);
                  setNewResourceName('');
                } catch (error) {
                  console.error('Erreur lors de la sauvegarde sous:', error);
                } finally {
                  setSaveAsSubmitting(false);
                }
              }
            }}
            variant="contained"
            disabled={!newResourceName.trim() || saveAsSubmitting}
            startIcon={saveAsSubmitting ? <CircularProgress size={16} /> : <SaveAsIcon />}
          >
            {saveAsSubmitting ? 'Sauvegarde...' : 'Sauvegarder'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ResourceHtmlEditor;