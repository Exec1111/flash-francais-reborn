import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
    IconButton,
    Pagination
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import _debounce from 'lodash/debounce';
import studyObjectService from '../../services/studyObjectService';

const StudyObjectSelectorModal = ({ open, onClose, initialSelectedStudyObjects = [], onSave }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [studyObjectSearchResults, setStudyObjectSearchResults] = useState([]);
    const [selectedStudyObjects, setSelectedStudyObjects] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const objectsPerPage = 10;
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);

    useEffect(() => {
        if (open) {
            const initialArray = Array.isArray(initialSelectedStudyObjects) ? initialSelectedStudyObjects : [];
            setSelectedStudyObjects(initialArray);
            setCurrentPage(1);
            fetchStudyObjects(searchTerm, 1);
        }
    }, [open, initialSelectedStudyObjects]);

    const fetchStudyObjects = useCallback(async (term, page) => {
        setLoading(true);
        setError('');
        try {
            const skip = (page - 1) * objectsPerPage;
            const params = {
                limit: objectsPerPage,
                skip: skip
            };
            if (term) {
                params.search = term;
            }
            
            const response = await studyObjectService.getStudyObjects(params.skip, params.limit, params.search);
            
            setStudyObjectSearchResults(response.items || []);
            setTotalPages(Math.ceil(response.total / objectsPerPage) || 0);

        } catch (err) {
            setError('Impossible de charger les objets d\'étude. Veuillez réessayer.');
            setStudyObjectSearchResults([]);
            setTotalPages(0);
        } finally {
            setLoading(false);
        }
    }, [objectsPerPage]);

    const debouncedFetchStudyObjects = useMemo(
        () => _debounce((term, page) => fetchStudyObjects(term, page), 300),
        [fetchStudyObjects]
    );

    useEffect(() => {
        if (open) {
            debouncedFetchStudyObjects(searchTerm, currentPage);
        }
        return () => {
            debouncedFetchStudyObjects.cancel();
        };
    }, [searchTerm, open, debouncedFetchStudyObjects, currentPage]);

    const handleSearchChange = (event) => {
        const newSearchTerm = event.target.value;
        setSearchTerm(newSearchTerm);
        setCurrentPage(1);
    };

    const handlePageChange = (event, value) => {
        setCurrentPage(value);
    };

    const handleToggle = (studyObject) => () => {
        const currentIndex = selectedStudyObjects.findIndex(o => o.id === studyObject.id);
        const newSelectedStudyObjects = [...selectedStudyObjects];
        if (currentIndex === -1) {
            newSelectedStudyObjects.push(studyObject);
        } else {
            newSelectedStudyObjects.splice(currentIndex, 1);
        }
        setSelectedStudyObjects(newSelectedStudyObjects);
    };

    const handleSaveChanges = () => {
        onSave(selectedStudyObjects);
        onClose();
    };

    const selectedStudyObjectIds = useMemo(() => new Set(selectedStudyObjects.map(obj => obj.id)), [selectedStudyObjects]);

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                Associer des objets d'étude
                <IconButton
                    aria-label="close"
                    onClick={onClose}
                    sx={{ position: 'absolute', right: 8, top: 8 }}
                >
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers>
                <TextField
                    fullWidth
                    label="Rechercher des objets d'étude par titre ou description"
                    variant="outlined"
                    value={searchTerm}
                    onChange={handleSearchChange}
                    sx={{ mb: 2 }}
                />
                {error && <Alert severity="error">{error}</Alert>}
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <List dense>
                        {studyObjectSearchResults.length > 0 ? (
                            studyObjectSearchResults.map((studyObject) => {
                                const labelId = `checkbox-list-label-${studyObject.id}`;
                                const isSelected = selectedStudyObjectIds.has(studyObject.id);
                                return (
                                    <ListItem
                                        key={studyObject.id}
                                        role={undefined}
                                        dense
                                        button
                                        onClick={handleToggle(studyObject)}
                                    >
                                        <ListItemIcon>
                                            <Checkbox
                                                edge="start"
                                                checked={isSelected}
                                                tabIndex={-1}
                                                disableRipple
                                                inputProps={{ 'aria-labelledby': labelId }}
                                            />
                                        </ListItemIcon>
                                        <ListItemText
                                            id={labelId}
                                            primary={studyObject.title}
                                            secondary={studyObject.description || 'Aucune description'}
                                        />
                                    </ListItem>
                                );
                            })
                        ) : (
                            searchTerm && !loading && (
                                <Typography sx={{ textAlign: 'center', color: 'text.secondary', mt: 2 }}>
                                    Aucun objet d'étude trouvé pour "{searchTerm}".
                                </Typography>
                            )
                        )}
                        {!searchTerm && !loading && studyObjectSearchResults.length === 0 && (
                            <Typography sx={{ textAlign: 'center', color: 'text.secondary', mt: 2 }}>
                                Entrez un terme pour rechercher ou affiner votre recherche.
                            </Typography>
                        )}
                    </List>
                )}
                {selectedStudyObjects.length > 0 && (
                    <Box sx={{ mt: 2, p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>Objets d'étude actuellement sélectionnés : {selectedStudyObjects.length}</Typography>
                        <List dense sx={{ maxHeight: 100, overflow: 'auto'}}>
                            {selectedStudyObjects.map(obj => (
                                <ListItem key={`selected-${obj.id}`} dense>
                                    <ListItemText primary={obj.title} />
                                </ListItem>
                            ))}
                        </List>
                    </Box>
                )}
                {totalPages > 0 && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                        <Pagination
                            count={totalPages}
                            page={currentPage}
                            onChange={handlePageChange}
                            color="primary"
                        />
                    </Box>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Annuler</Button>
                <Button onClick={handleSaveChanges} variant="contained">
                    Valider la Sélection ({selectedStudyObjects.length})
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default StudyObjectSelectorModal;
