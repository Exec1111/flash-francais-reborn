import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField
} from '@mui/material';
import PsychologyIcon from '@mui/icons-material/Psychology';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import SaveIcon from '@mui/icons-material/Save';
import SaveAsIcon from '@mui/icons-material/SaveAs';
import TinyHtmlEditor from '../../editors/TinyHtmlEditor';
import HtmlChatBot from '../../htmlChat/HtmlChatBot';
import { Champlex2Editor, ChamplexEditor, QcmEditor, hasStructuredEditor, getStructuredEditor } from '../editors';

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

  // Structured editor state
  const [structuredEditorName, setStructuredEditorName] = useState(null);

  // Detect if this is a structured editor resource
  useEffect(() => {
    const subtypeKey = ((initialData?.sub_type?.key) || '').toLowerCase();
    const editorName = getStructuredEditor(subtypeKey);
    setStructuredEditorName(editorName);
  }, [initialData]);


  // Custom save handler for structured editors
  const handleSaveStructuredData = async (data) => {
    try {
      // Create FormData and send data_json_text
      const dataToSend = new FormData();
      dataToSend.append('data_json_text', JSON.stringify(data));
      
      // Use the resource service to update
      const resourceService = await import('../../../services/resourceService');
      const response = await resourceService.default.update(initialData.id, dataToSend);
      
      console.log('[DEBUG] Sauvegarde réussie, données mises à jour:', response);
      
      // Forcer le rechargement de la page pour vider le cache et voir les nouvelles données
      window.location.reload();
      
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des données structurées:', error);
      throw error;
    }
  };
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

      {/* Blocking overlay for Save As operation */}
      {saveAsSubmitting && (
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
            zIndex: 3000,
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

      {/* Header with controls - Only for HTML editor */}
      {!structuredEditorName && (
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
      )}

      {/* Main content area */}
      <Box sx={{ flex: 1, display: 'flex', overflow: structuredEditorName ? 'auto' : 'hidden' }}>
        {structuredEditorName ? (
          /* Structured editor for exercises */
          <Box sx={{ width: '100%', overflow: 'auto' }}>
            {structuredEditorName === 'Champlex2Editor' && (
              <Champlex2Editor
                initialData={initialData}
                onSave={handleSaveStructuredData}
                onCancel={handleCancelEditing}
                submitting={submitting}
              />
            )}
            {structuredEditorName === 'ChamplexEditor' && (
              <ChamplexEditor
                initialData={initialData}
                onSave={handleSaveStructuredData}
                onCancel={handleCancelEditing}
                submitting={submitting}
              />
            )}
            {structuredEditorName === 'QcmEditor' && (
              <QcmEditor
                initialData={initialData}
                onSave={handleSaveStructuredData}
                onCancel={handleCancelEditing}
                submitting={submitting}
              />
            )}
          </Box>
        ) : (
          <>
            {/* Main HTML editor */}
            <Box sx={{ flex: showAiChat ? 2 : 1, mr: showAiChat ? 1 : 0 }}>
              <TinyHtmlEditor
                ref={editorRef}
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
              </Box>
            )}
          </>
        )}
      </Box>
      
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
    </Box>
  );
};

export default ResourceHtmlEditingMode;