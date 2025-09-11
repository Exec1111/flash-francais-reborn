import React, { useEffect, useState } from 'react';
import { Box, Paper, Typography, LinearProgress, Button, Stack, Snackbar, Alert } from '@mui/material';
import MaintenanceService from '../../services/maintenance';

const bytesToMB = (b) => Math.round((b / (1024*1024)) * 100) / 100;

export default function StorageUsagePanel() {
  const [loading, setLoading] = useState(true);
  const [usage, setUsage] = useState(null);
  const [toast, setToast] = useState({ open: false, type: 'info', msg: '' });

  const show = (type, msg) => setToast({ open: true, type, msg });
  const close = (_, r) => { if (r === 'clickaway') return; setToast({ ...toast, open: false }); };

  const load = async () => {
    try {
      setLoading(true);
      const data = await MaintenanceService.getStorageUsage();
      if (data && data.success) setUsage(data.usage);
      else show('error', 'Impossible de récupérer l\'usage de stockage');
    } catch (e) {
      show('error', 'Erreur lors du chargement de l\'usage de stockage');
    } finally {
      setLoading(false);
    }
  };

  const onEmptyTrash = async () => {
    try {
      const res = await MaintenanceService.emptyTrash();
      if (res && res.success) {
        show('success', `Corbeille vidée (${res.deleted} élément(s))`);
        await load();
      } else {
        show('error', 'Échec du vidage de la corbeille');
      }
    } catch (e) {
      show('error', 'Erreur lors du vidage de la corbeille');
    }
  };

  useEffect(() => { load(); }, []);

  const percent = usage && usage.quota_mb ? Math.min(100, Math.round((usage.used_mb / usage.quota_mb) * 100)) : null;

  return (
    <Paper elevation={1} sx={{ p: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
        <Typography variant="h6">Stockage</Typography>
        <Button variant="outlined" size="small" onClick={load} disabled={loading}>Rafraîchir</Button>
      </Stack>

      {loading && <Box sx={{ my: 2 }}><LinearProgress /></Box>}

      {!loading && usage && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Utilisé (hors corbeille): <b>{usage.used_mb} Mo</b>
            {usage.quota_mb ? <> / <b>{usage.quota_mb} Mo</b></> : null}
          </Typography>
          {percent !== null && (
            <Box sx={{ mb: 2 }}>
              <LinearProgress variant="determinate" value={percent} />
              <Typography variant="caption">{percent}% du quota</Typography>
            </Box>
          )}
          <Typography variant="body2" sx={{ mb: 2 }}>
            Corbeille: <b>{usage.trash_mb} Mo</b>
          </Typography>
          <Stack direction="row" spacing={2}>
            <Button variant="contained" color="warning" onClick={onEmptyTrash}>Vider la corbeille</Button>
          </Stack>
        </Box>
      )}

      <Snackbar open={toast.open} autoHideDuration={4000} onClose={close} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert onClose={close} severity={toast.type} sx={{ width: '100%' }}>
          {toast.msg}
        </Alert>
      </Snackbar>
    </Paper>
  );
}
