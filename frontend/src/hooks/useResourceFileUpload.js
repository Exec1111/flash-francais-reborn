import { useState, useCallback } from 'react';

/**
 * Hook personnalisé pour gérer l'upload et la validation des fichiers
 */
export const useResourceFileUpload = (allowedFileTypes, maxFileSize, allowedFileTypesLabel, maxUploadSizeMB) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileError, setFileError] = useState('');

  const handleFileChange = useCallback((e) => {
    const file = e.target.files[0];
    if (file) {
      if (!allowedFileTypes.includes(file.type)) {
        setFileError(`Type de fichier non autorisé. Types autorisés: ${allowedFileTypesLabel}.`);
        setSelectedFile(null);
      } else if (file.size > maxFileSize) {
        setFileError(`Fichier trop volumineux (max ${maxUploadSizeMB} Mo).`);
        setSelectedFile(null);
      } else {
        setSelectedFile(file);
        setFileError('');
      }
    } else {
      setSelectedFile(null);
      setFileError('');
    }
  }, [allowedFileTypes, maxFileSize, allowedFileTypesLabel, maxUploadSizeMB]);

  const resetFileState = useCallback(() => {
    setSelectedFile(null);
    setFileError('');
  }, []);

  return {
    selectedFile,
    fileError,
    setFileError,
    handleFileChange,
    resetFileState
  };
};