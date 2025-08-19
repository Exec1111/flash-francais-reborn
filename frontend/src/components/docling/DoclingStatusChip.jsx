import React, { useEffect, useState } from 'react';
import { Chip, IconButton, Stack, Tooltip, CircularProgress } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import resourceService from '../../services/resourceService';

/**
 * DoclingStatusChip
 * - Affiche un Chip coloré avec le statut Docling d'une ressource PDF
 * - Sans polling (rafraîchissement manuel via bouton)
 *
 * Props:
 * - resourceId: number (requis)
 * - fileType: string (optionnel)  // pour détection PDF
 * - filePath: string (optionnel)  // pour détection PDF
 * - size: 'small' | 'medium' (optionnel, défaut 'small')
 * - autoFetch: boolean (optionnel, défaut false) // si true, fait un fetch initial
 */
const DoclingStatusChip = ({ resourceId, fileType, filePath, size = 'small', autoFetch = false }) => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const isPdf = (() => {
    const ft = (fileType || '').toLowerCase();
    const fp = (filePath || '').toLowerCase();
    return ft === 'application/pdf' || (!!fp && fp.endsWith('.pdf'));
  })();

  const chipColor = (s) => {
    switch ((s || '').toLowerCase()) {
      case 'ready': return 'success';
      case 'processing': return 'info';
      case 'pending': return 'warning';
      case 'error': return 'error';
      default: return 'default';
    }
  };

  const fetchStatus = async () => {
    if (!resourceId || !isPdf) return;
    setLoading(true);
    setError(null);
    try {
      const data = await resourceService.getDoclingStatus(resourceId);
      setStatus(data?.status || null);
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || 'Erreur statut Docling');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (autoFetch) fetchStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resourceId, fileType, filePath, autoFetch]);

  if (!isPdf) return null;

  return (
    <Stack direction="row" spacing={0.5} alignItems="center">
      <Tooltip title={error ? String(error) : ''} disableHoverListener={!error} arrow>
        <Chip size={size} label={`Docling: ${status || 'inconnu'}`} color={chipColor(status)} variant="outlined" />
      </Tooltip>
      <IconButton size="small" onClick={(e) => { e.stopPropagation(); fetchStatus(); }} disabled={loading} aria-label="actualiser statut docling">
        {loading ? <CircularProgress size={16} /> : <RefreshIcon fontSize="inherit" />}
      </IconButton>
    </Stack>
  );
};

export default DoclingStatusChip;
