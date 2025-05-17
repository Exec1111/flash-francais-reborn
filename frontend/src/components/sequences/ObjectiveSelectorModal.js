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
    Pagination // Import du composant Pagination
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import _debounce from 'lodash/debounce';
import api from '../../services/api'; // Assurez-vous que le chemin est correct

const ObjectiveSelectorModal = ({ open, onClose, initialSelectedObjectives = [], onSave }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [objectiveSearchResults, setObjectiveSearchResults] = useState([]);
    const [selectedObjectives, setSelectedObjectives] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const objectivesPerPage = 10; // Limite pour la recherche
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);

    // Initialiser la sélection interne quand le modal s'ouvre
    useEffect(() => {
        if (open) {
            // S'assurer que initialSelectedObjectives est bien un tableau
            const initialArray = Array.isArray(initialSelectedObjectives) ? initialSelectedObjectives : [];
            setSelectedObjectives(initialArray);
            setCurrentPage(1); // Toujours commencer à la page 1 à l'ouverture
            // Charger les objectifs initiaux (sans terme de recherche) ou les résultats du terme actuel
            fetchObjectives(searchTerm, 1); // Passer la page initiale
        }
    }, [open, initialSelectedObjectives]); // Dépendance à initialSelectedObjectives ajoutée

    // Fonction pour récupérer les objectifs depuis l'API
    const fetchObjectives = useCallback(async (term, page = 1) => {
        setLoading(true);
        setError('');
        try {
            const token = localStorage.getItem('token');
            const params = {
                limit: objectivesPerPage,
                skip: (page - 1) * objectivesPerPage // Calculer skip en fonction de la page
            };
            if (term) {
                params.search = term;
            }

            const response = await api.get('/objectives/', { // Utilisation de l'endpoint des objectifs
                headers: { Authorization: `Bearer ${token}` },
                params: params
            });
            // La réponse est maintenant { total: number, items: Objective[] }
            setObjectiveSearchResults(Array.isArray(response.data.items) ? response.data.items : []);
            setTotalPages(Math.ceil(response.data.total / objectivesPerPage));
            setCurrentPage(page); // Mettre à jour la page actuelle après le fetch réussi

        } catch (err) {
            console.error("Erreur lors de la recherche des objectifs:", err);
            setError('Impossible de charger les objectifs. Veuillez réessayer.');
            setObjectiveSearchResults([]); // Vider les résultats en cas d'erreur
            setTotalPages(0);
        } finally {
            setLoading(false);
        }
    }, [objectivesPerPage]); // useCallback dépend de objectivesPerPage

    // Utilisation du debounce pour la recherche
    const debouncedFetchObjectives = useMemo(
        () => _debounce((term, page) => fetchObjectives(term, page), 300),
        [fetchObjectives] // Recréer si fetchObjectives change
    );

    // Appeler la recherche débauncée quand searchTerm change
    useEffect(() => {
        // Ne pas lancer de recherche vide au début si on ne veut pas de résultats initiaux
         if (open) { // Assurer que la recherche n'est déclenchée que si le modal est ouvert
            setCurrentPage(1); // Réinitialiser à la page 1 pour une nouvelle recherche
            debouncedFetchObjectives(searchTerm, 1);
         }
         // Cleanup debounce à la fermeture ou au changement de terme
         return () => {
            debouncedFetchObjectives.cancel();
         };
    }, [searchTerm, open, debouncedFetchObjectives]);

    // Gérer le changement du terme de recherche
    const handleSearchChange = (event) => {
        setSearchTerm(event.target.value);
    };

    // Gérer le changement de page
    const handlePageChange = (event, newPage) => {
        fetchObjectives(searchTerm, newPage);
    };

    // Gérer le clic sur une checkbox (sélection/désélection)
    const handleToggle = (objective) => () => {
        const currentIndex = selectedObjectives.findIndex(o => o.id === objective.id);
        const newSelectedObjectives = [...selectedObjectives];

        if (currentIndex === -1) {
            newSelectedObjectives.push(objective); // Ajouter
        } else {
            newSelectedObjectives.splice(currentIndex, 1); // Retirer
        }
        setSelectedObjectives(newSelectedObjectives);
    };

    // Sauvegarder la sélection et fermer le modal
    const handleSaveChanges = () => {
        onSave(selectedObjectives); // Envoyer la sélection au composant parent
        onClose(); // Fermer le modal
    };

    // Utiliser un Set pour vérifier rapidement si un objectif est sélectionné
    const selectedObjectiveIds = useMemo(() =>
        new Set(selectedObjectives.map(o => o.id)),
        [selectedObjectives]
    );

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>
                Sélectionner des Objectifs
                <IconButton
                    aria-label="close"
                    onClick={onClose}
                    sx={{
                        position: 'absolute',
                        right: 8,
                        top: 8,
                        color: (theme) => theme.palette.grey[500],
                    }}
                >
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers>
                <TextField
                    fullWidth
                    label="Rechercher des objectifs par titre ou description"
                    variant="outlined"
                    value={searchTerm}
                    onChange={handleSearchChange}
                    sx={{ mb: 2 }}
                />

                {/* Indicateur de chargement */}
                {loading && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
                        <CircularProgress />
                    </Box>
                )}
                {/* Message d'erreur */}
                {error && <Alert severity="error" sx={{ my: 1 }}>{error}</Alert>}

                {/* Liste des résultats */}
                {!loading && !error && (
                    <List sx={{ width: '100%', maxHeight: 350, overflow: 'auto', bgcolor: 'background.paper' }}>
                        {objectiveSearchResults.length > 0 ? (
                            objectiveSearchResults.map((objective) => {
                                const labelId = `checkbox-list-label-${objective.id}`;
                                const isSelected = selectedObjectiveIds.has(objective.id);
                                return (
                                    <ListItem
                                        key={objective.id}
                                        role={undefined}
                                        dense
                                        button // Remplacé par component="li" et sx pour curseur si besoin
                                        onClick={handleToggle(objective)}
                                        // sx={{ cursor: 'pointer' }} // Alternative à button
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
                                            primary={objective.title}
                                            secondary={objective.description || 'Aucune description'}
                                        />
                                    </ListItem>
                                );
                            })
                        ) : (
                             // Afficher un message si la recherche est active mais sans résultats
                             searchTerm && !loading && (
                                <Typography sx={{ textAlign: 'center', color: 'text.secondary', mt: 2 }}>
                                    Aucun objectif trouvé pour "{searchTerm}".
                                </Typography>
                            )
                        )}
                         {/* Afficher un message si pas de recherche et pas de résultats (ou résultats vides) */}
                         {!searchTerm && !loading && objectiveSearchResults.length === 0 && (
                             <Typography sx={{ textAlign: 'center', color: 'text.secondary', mt: 2 }}>
                                 Entrez un terme pour rechercher ou affiner votre recherche.
                            </Typography>
                         )}
                    </List>
                )}

                {totalPages > 1 && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                        <Pagination 
                            count={totalPages}
                            page={currentPage}
                            onChange={handlePageChange}
                            color="primary"
                        />
                    </Box>
                )}

                 {/* Afficher les objectifs déjà sélectionnés pour info */}
                 {selectedObjectives.length > 0 && (
                    <Box sx={{ mt: 2, p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>Objectifs actuellement sélectionnés : {selectedObjectives.length}</Typography>
                         <List dense sx={{ maxHeight: 100, overflow: 'auto'}}>
                            {selectedObjectives.map(obj => (
                                <ListItem key={`selected-${obj.id}`} dense>
                                    <ListItemText primary={obj.title} />
                                </ListItem>
                            ))}
                        </List>
                    </Box>
                 )}

            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Annuler</Button>
                <Button onClick={handleSaveChanges} variant="contained">
                    Valider la Sélection ({selectedObjectives.length})
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ObjectiveSelectorModal;
