import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from '../services/api';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, CircularProgress, Dialog, DialogTitle, DialogContent, IconButton, Button, Tooltip, TextField, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import CloseIcon from '@mui/icons-material/Close';

const AdminLLMLogs = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openCell, setOpenCell] = useState({row: null, col: null, value: '', title: ''});
  const [refreshing, setRefreshing] = useState(false);

  // États de filtre
  const [modelFilter, setModelFilter] = useState('');
  const [promptTypeFilter, setPromptTypeFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [showErrorsOnly, setShowErrorsOnly] = useState(false);

  // Fonction pour charger les données
  const loadLogData = async () => {
    try {
      setRefreshing(true);
      // Utilisateur admin: chargement des logs
      const response = await axios.get('/admin/llm-logs');
      setLogs(response.data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des logs LLM:', error);
      setLogs([]);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  // Fonction pour rafraîchir les données
  const handleRefresh = () => {
    loadLogData();
  };

  useEffect(() => {
    // Vérification explicite de l'administrateur avant de charger les données
    const checkAdminAndLoadData = async () => {
      try {
        setLoading(true);
        // Vérification que l'utilisateur est connecté et a le rôle admin
        if (!user) {
          // Si pas d'utilisateur authentifié, on redirige vers le dashboard
          navigate('/dashboard');
          return;
        }
      
        if (user.role && user.role.toLowerCase() === 'admin') {
          await loadLogData();
        } else {
          // Utilisateur non admin: redirection vers dashboard
          navigate('/dashboard');
        }
      } catch (error) {
        console.error('Erreur lors du chargement des logs LLM:', error);
        setLoading(false);
      }
    };
    
    checkAdminAndLoadData();
  }, [user, navigate]);

  // Logs filtrés
  const filteredLogs = React.useMemo(() => {
    return logs.filter((log) => {
      const byModel = modelFilter ? log.model_name?.toLowerCase().includes(modelFilter.toLowerCase()) : true;
      const byPrompt = promptTypeFilter ? log.prompt_type?.toLowerCase().includes(promptTypeFilter.toLowerCase()) : true;
      const byUser = userFilter ? String(log.user_id).includes(userFilter) : true;
      const byError = showErrorsOnly ? !!log.error_message : true;
      return byModel && byPrompt && byUser && byError;
    });
  }, [logs, modelFilter, promptTypeFilter, userFilter, showErrorsOnly]);

  if (loading) {
    return <Box display="flex" justifyContent="center" alignItems="center" height="60vh"><CircularProgress /></Box>;
  }

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={2}>
        <Typography variant="h5" gutterBottom>Logs d'interactions LLM</Typography>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<RefreshIcon />} 
          onClick={handleRefresh}
          disabled={refreshing}
        >
          {refreshing ? 'Rafraîchissement...' : 'Rafraîchir'}
        </Button>

        {/* Filtres */}
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <TextField 
            label="Modèle" 
            variant="outlined" 
            value={modelFilter} 
            onChange={(e) => setModelFilter(e.target.value)}
          />
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <TextField 
            label="Type prompt" 
            variant="outlined" 
            value={promptTypeFilter} 
            onChange={(e) => setPromptTypeFilter(e.target.value)}
          />
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <TextField 
            label="Utilisateur" 
            variant="outlined" 
            value={userFilter} 
            onChange={(e) => setUserFilter(e.target.value)}
          />
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel id="error-filter-label">Erreurs</InputLabel>
          <Select
            labelId="error-filter-label"
            value={showErrorsOnly ? 'errors' : 'all'}
            label="Erreurs"
            onChange={(e) => setShowErrorsOnly(e.target.value === 'errors')}
          >
            <MenuItem value="all">Toutes</MenuItem>
            <MenuItem value="errors">Avec erreur</MenuItem>
          </Select>
        </FormControl>
      </Box>
      <TableContainer component={Paper} sx={{ maxHeight: '75vh' }}>
        <Table size="small" sx={{ '& .MuiTableCell-root': { fontSize: '0.65rem', padding: '3px 6px' } }}>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#0a1929', color: 'white' }}>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Date</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Modèle</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Type prompt</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Prompt</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Sortie brute</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Erreur</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Durée (ms)</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Utilisateur</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(filteredLogs || []).map((log, rowIdx) => (
              <TableRow key={log.id}>
                <TableCell>
                  <span style={{fontSize:'0.65rem',maxWidth:140,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',display:'inline-block',verticalAlign:'middle'}}>{log.timestamp ? new Date(log.timestamp).toLocaleString() : ''}</span>
                </TableCell>
                <TableCell>
                  <Tooltip title={log.model_name}>
                    <span style={{fontSize:'0.65rem',maxWidth:120,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',display:'inline-block',verticalAlign:'middle'}}>{log.model_name}</span>
                  </Tooltip>
                </TableCell>
                <TableCell>
                  <span style={{fontSize:'0.65rem',maxWidth:120,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',display:'inline-block',verticalAlign:'middle'}}>{log.prompt_type}</span>
                </TableCell>
                <TableCell>
                  <Tooltip title="Cliquer pour voir le contenu complet">
                    <span 
                      className="clickable-cell" 
                      style={{cursor:'pointer',fontSize:'0.65rem',maxWidth:140,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',display:'inline-block',verticalAlign:'middle',textDecoration:'underline',color:'#1976d2'}}
                      onClick={() => setOpenCell({row: rowIdx, col: 3, value: log.input_prompt, title: 'Prompt'})}
                    >
                      {log.input_prompt}
                    </span>
                  </Tooltip>
                </TableCell>
                <TableCell>
                  <Tooltip title="Cliquer pour voir le contenu complet">
                    <span 
                      className="clickable-cell" 
                      style={{cursor:'pointer',fontSize:'0.65rem',maxWidth:140,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',display:'inline-block',verticalAlign:'middle',textDecoration:'underline',color:'#1976d2'}}
                      onClick={() => setOpenCell({row: rowIdx, col: 4, value: log.output_content, title: 'Sortie'})}
                    >
                      {log.output_content}
                    </span>
                  </Tooltip>
                </TableCell>
                <TableCell>
                  <span style={{color: log.error_message ? 'red' : 'inherit',fontSize:'0.65rem',maxWidth:100,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',display:'inline-block',verticalAlign:'middle'}}>{log.error_message}</span>
                </TableCell>
                <TableCell>
                  <span style={{fontSize:'0.65rem',maxWidth:80,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',display:'inline-block',verticalAlign:'middle'}}>{log.duration_ms}</span>
                </TableCell>
                <TableCell>
                  <span style={{fontSize:'0.65rem',maxWidth:80,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',display:'inline-block',verticalAlign:'middle'}}>{log.user_id}</span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <Dialog open={openCell.row !== null} onClose={() => setOpenCell({row: null, col: null, value: '', title: ''})} maxWidth="md" fullWidth>
            <DialogTitle>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                {openCell.title || 'Contenu détaillé'}
                <IconButton size="small" onClick={() => setOpenCell({row: null, col: null, value: '', title: ''})}>
                  <CloseIcon />
                </IconButton>
              </Box>
            </DialogTitle>
            <DialogContent>
              <Box sx={{
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontFamily: 'monospace',
                fontSize: '0.85rem',
                maxHeight: '70vh',
                overflow: 'auto',
                backgroundColor: '#111827',
                color: '#e5e7eb',
                padding: '16px',
                borderRadius: '4px',
                boxShadow: 'inset 0 0 6px rgba(0,0,0,0.3)'
              }}>
                {openCell.value}
              </Box>
            </DialogContent>
          </Dialog>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default AdminLLMLogs;
