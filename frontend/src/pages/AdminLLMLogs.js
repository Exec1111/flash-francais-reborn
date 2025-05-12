import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from '../services/api';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, CircularProgress, Dialog, DialogTitle, DialogContent, IconButton } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';

const AdminLLMLogs = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openCell, setOpenCell] = useState({row: null, col: null, value: ''});

  useEffect(() => {
    // Redirection si non admin
    if (!user || (user.role && user.role.toLowerCase() !== 'admin')) {
      navigate('/dashboard');
      return;
    }
    axios.get('/admin/llm-logs')
      .then(res => setLogs(res.data))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, [user, navigate]);

  if (loading) {
    return <Box display="flex" justifyContent="center" alignItems="center" height="60vh"><CircularProgress /></Box>;
  }

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>Logs d'interactions LLM</Typography>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Modèle</TableCell>
              <TableCell>Type prompt</TableCell>
              <TableCell>Prompt</TableCell>
              <TableCell>Sortie brute</TableCell>
              <TableCell>Erreur</TableCell>
              <TableCell>Durée (ms)</TableCell>
              <TableCell>Utilisateur</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(logs || []).map((log, rowIdx) => (
              <TableRow key={log.id}>
                <TableCell>
                  <span style={{maxWidth:120,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',display:'inline-block',verticalAlign:'middle'}}>{log.timestamp ? new Date(log.timestamp).toLocaleString() : ''}</span>
                </TableCell>
                <TableCell>
                  <span style={{maxWidth:120,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',display:'inline-block',verticalAlign:'middle'}}>{log.model_name}</span>
                </TableCell>
                <TableCell>
                  <span style={{maxWidth:120,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',display:'inline-block',verticalAlign:'middle'}}>{log.prompt_type}</span>
                </TableCell>
                <TableCell>
                  <span style={{maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',display:'inline-block',verticalAlign:'middle'}}>{log.input_prompt}</span>
                  <IconButton size="small" onClick={() => setOpenCell({row: rowIdx, col: 3, value: log.input_prompt})}><VisibilityIcon fontSize="small" /></IconButton>
                </TableCell>
                <TableCell>
                  <span style={{maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',display:'inline-block',verticalAlign:'middle'}}>{log.output_content}</span>
                  <IconButton size="small" onClick={() => setOpenCell({row: rowIdx, col: 4, value: log.output_content})}><VisibilityIcon fontSize="small" /></IconButton>
                </TableCell>
                <TableCell>
                  <span style={{color: log.error_message ? 'red' : 'inherit',maxWidth:120,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',display:'inline-block',verticalAlign:'middle'}}>{log.error_message}</span>
                </TableCell>
                <TableCell>
                  <span style={{maxWidth:80,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',display:'inline-block',verticalAlign:'middle'}}>{log.duration_ms}</span>
                </TableCell>
                <TableCell>
                  <span style={{maxWidth:80,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',display:'inline-block',verticalAlign:'middle'}}>{log.user_id}</span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <Dialog open={openCell.row !== null} onClose={() => setOpenCell({row: null, col: null, value: ''})} maxWidth="md" fullWidth>
            <DialogTitle>Contenu de la cellule</DialogTitle>
            <DialogContent>
              <Box sx={{whiteSpace:'pre-wrap',wordBreak:'break-word',fontFamily:'monospace'}}>{openCell.value}</Box>
            </DialogContent>
          </Dialog>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default AdminLLMLogs;
