import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button,
    List,
    ListItem,
    ListItemText,
    Checkbox,
    ListItemIcon,
    CircularProgress,
    Alert,
    Typography,
    Box,
    IconButton
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import studyObjectService from '../../services/studyObjectService';

const StudyObjectSelectorModal = ({
    open,
    onClose,
    initialSelectedStudyObjects = [],
    onSave,
    progressionId
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [studyObjectSearchResults, setStudyObjectSearchResults] = useState([]);
    const [selectedStudyObjects, setSelectedStudyObjects] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (open) {
            setSelectedStudyObjects(initialSelectedStudyObjects);
            fetchStudyObjects();
        }
    }, [open, initialSelectedStudyObjects, progressionId]);

    // Correction : toujours filtrer les objets d'étude sur la progression courante, même lors d'une recherche
    const fetchStudyObjects = async () => {
        setLoading(true);
        setError('');
        try {
            let filteredObjs = [];
            if (progressionId) {
                // Utiliser l'endpoint dédié
                filteredObjs = await studyObjectService.getStudyObjectsByProgression(progressionId);
            } else {
                filteredObjs = [];
            }
            if (searchTerm.trim()) {
                filteredObjs = filteredObjs.filter(obj =>
                    obj.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (obj.description && obj.description.toLowerCase().includes(searchTerm.toLowerCase()))
                );
            }
            setStudyObjectSearchResults(filteredObjs);
        } catch (err) {
            setError("Erreur lors de la récupération des objets d'étude : " + (err.detail || err.message || 'Erreur inconnue'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (open) fetchStudyObjects();
        // eslint-disable-next-line
    }, [searchTerm]);

    const handleToggle = (studyObject) => () => {
        const currentIndex = selectedStudyObjects.findIndex(o => o.id === studyObject.id);
        const newSelected = [...selectedStudyObjects];
        if (currentIndex === -1) {
            newSelected.push(studyObject);
        } else {
            newSelected.splice(currentIndex, 1);
        }
        setSelectedStudyObjects(newSelected);
    };

    const handleSaveChanges = () => {
        onSave(selectedStudyObjects);
        onClose();
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                Sélectionner les objets d'étude
                <IconButton
                    aria-label="close"
                    onClick={onClose}
                    sx={{ position: 'absolute', right: 8, top: 8, color: (theme) => theme.palette.grey[500] }}
                >
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers>
                {error && <Alert severity="error">{error}</Alert>}
                <TextField
                    fullWidth
                    label="Rechercher par titre ou description"
                    variant="outlined"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    sx={{ mb: 2 }}
                />
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <List>
                        {studyObjectSearchResults.length === 0 ? (
                            <Typography variant="body2" color="text.secondary">Aucun objet d'étude disponible.</Typography>
                        ) : studyObjectSearchResults.map(obj => (
                            <ListItem key={obj.id} button onClick={handleToggle(obj)}>
                                <ListItemIcon>
                                    <Checkbox
                                        edge="start"
                                        checked={selectedStudyObjects.some(o => o.id === obj.id)}
                                        tabIndex={-1}
                                        disableRipple
                                    />
                                </ListItemIcon>
                                <ListItemText
                                    primary={obj.title}
                                    secondary={obj.description}
                                />
                            </ListItem>
                        ))}
                    </List>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="secondary">Annuler</Button>
                <Button onClick={handleSaveChanges} variant="contained" color="primary">Valider</Button>
            </DialogActions>
        </Dialog>
    );
};

export default StudyObjectSelectorModal;
