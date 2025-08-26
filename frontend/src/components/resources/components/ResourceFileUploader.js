import React from 'react';
import { Grid, Box, Button, Typography, Alert } from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { API_BASE_URL } from '../../../services/api';

/**
 * Component for file upload functionality
 */
const ResourceFileUploader = ({
  sourceType,
  selectedFile,
  fileError,
  handleFileChange,
  submitting,
  isEdit,
  initialData,
  ALLOWED_FILE_TYPES,
  ALLOWED_FILE_TYPES_LABEL,
  MAX_UPLOAD_SIZE_MB
}) => {
  if (sourceType !== 'file') {
    return null;
  }

  return (
    <>
      {/* File upload section */}
      <Grid item xs={12}>
        <Box sx={{ border: '1px dashed grey', padding: 2, textAlign: 'center' }}>
          <input
            accept={ALLOWED_FILE_TYPES.join(',')}
            style={{ display: 'none' }}
            id="raised-button-file"
            type="file"
            onChange={handleFileChange}
            disabled={submitting}
          />
          <label htmlFor="raised-button-file">
            <Button
              variant="outlined"
              component="span"
              startIcon={<UploadFileIcon />}
              disabled={submitting}
            >
              Choisir un fichier ({ALLOWED_FILE_TYPES_LABEL}) — Max {MAX_UPLOAD_SIZE_MB} Mo
            </Button>
          </label>
          {selectedFile && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              Fichier sélectionné: {selectedFile.name}
            </Typography>
          )}
          {fileError && (
            <Typography variant="body2" color="error" sx={{ mt: 1 }}>
              {fileError}
            </Typography>
          )}
          {isEdit && initialData?.source_type === 'file' && !selectedFile && initialData.file_name && (
            <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
              Fichier actuel: {initialData.file_name} (choisir un nouveau fichier pour remplacer)
            </Typography>
          )}
        </Box>
      </Grid>

      {/* Current file info for AI resources */}
      {isEdit && initialData?.source_type === 'ai' && initialData?.file_path && (
        <Grid item xs={12}>
          <Alert severity="info" sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              <span>
                Document actuellement lié :{' '}
                <a
                  href={`${API_BASE_URL}/media/uploads/${initialData.file_path.startsWith('/') ? initialData.file_path.substring(1) : initialData.file_path}`.replace(/\\/g, '/')}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Ouvrir le document généré
                </a>
              </span>
            </Box>
            <span style={{ fontStyle: 'italic', color: '#888' }}>
              Ce document est celui actuellement rattaché à la ressource.
            </span>
          </Alert>
        </Grid>
      )}
    </>
  );
};

export default ResourceFileUploader;