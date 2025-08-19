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
    Grid,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Pagination
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import _debounce from 'lodash/debounce';
import api from '../../services/api';
import PdfExtractionStatusChip from '../pdf/PdfExtractionStatusChip';

const ResourceSelectorModal = ({ open, onClose, initialSelectedResources = [], onSave, filterType = null }) => {
    // Log de débogage pour vérifier si filterType est correctement passé
    console.log("%cResourceSelectorModal initialisé avec:", "background: #2196f3; color: white; font-weight: bold; padding: 3px 5px;", {
        estOuvert: open,
        ressourcesInitiales: initialSelectedResources.length,
        typeFiltre: filterType
    });
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [selectedResources, setSelectedResources] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingFilters, setLoadingFilters] = useState(false); // Pour le chargement des filtres
    const [error, setError] = useState('');

    // États pour les filtres et la pagination
    const [availableTypes, setAvailableTypes] = useState([]);
    const [availableSubTypes, setAvailableSubTypes] = useState([]);
    const [selectedTypeId, setSelectedTypeId] = useState('');
    const [selectedSubTypeId, setSelectedSubTypeId] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalResources, setTotalResources] = useState(0);
    const resourcesPerPage = 10; // Configurable

    // Initialiser la sélection interne avec les ressources déjà sélectionnées dans le formulaire
    useEffect(() => {
        if (open) {
            setSelectedResources(initialSelectedResources || []);
            
            // Afficher dans la console si un filtre de type est spécifié
            if (filterType) {
                console.log(`%cModal ouvert avec filtre de type: ${filterType}`, 'background: #ff9800; color: white; padding: 2px 5px;');
            }
            
            // Charger la première page avec le filtre de type si spécifié
            fetchResources(1, searchTerm, selectedTypeId, selectedSubTypeId);
            fetchResourceTypes();
        }
    }, [open, initialSelectedResources, filterType]);

    // Charger les types de ressources
    const fetchResourceTypes = async () => {
        setLoadingFilters(true);
        try {
            const token = localStorage.getItem('token');
            const response = await api.get('/resources/types', {
                headers: { Authorization: `Bearer ${token}` },
            });
            setAvailableTypes(response.data || []);
        } catch (err) {
            console.error("Erreur lors du chargement des types de ressources:", err);
            // Gérer l'erreur (ex: afficher un message)
        } finally {
            setLoadingFilters(false);
        }
    };

    // Charger les sous-types en fonction du type sélectionné
    const fetchResourceSubTypes = async (typeId) => {
        if (!typeId) {
            setAvailableSubTypes([]);
            return;
        }
        setLoadingFilters(true);
        try {
            const token = localStorage.getItem('token');
            const response = await api.get('/resources/sub-types', {
                headers: { Authorization: `Bearer ${token}` },
                params: { type_id: typeId }
            });
            setAvailableSubTypes(response.data || []);
        } catch (err) {
            console.error("Erreur lors du chargement des sous-types de ressources:", err);
            setAvailableSubTypes([]); // Réinitialiser en cas d'erreur
        } finally {
            setLoadingFilters(false);
        }
    };

    // Fonction pour récupérer les ressources depuis l'API avec debounce
    // Suppression du debounce ici, on le gèrera sur l'input de recherche directement
    const fetchResources = useCallback(async (page, term, typeIdFromState, subTypeIdFromState) => {
        setLoading(true);
        setError('');
        try {
            const token = localStorage.getItem('token');
            
            const stackTrace = new Error().stack;
            console.log("%cStackTrace de l'appel fetchResources:", "color: #607d8b;", stackTrace);
            
            console.log("%cValeur de filterType dans fetchResources (avant construction params):", "background: #673ab7; color: white; padding: 2px 5px;", {
                filterType,
                typeIdFromState,
                subTypeIdFromState
            });
            
            const apiParams = {
                page: page,
                limit: resourcesPerPage,
                search: term || undefined,
            };

            if (filterType) {
                console.log(`%cUtilisation du filtre prioritaire filterType: ${filterType}. Les sélections de type/sous-type du formulaire seront ignorées.`, 'background: #e91e63; color: white; font-weight: bold; padding: 3px 5px;');
                apiParams.typeKey = filterType;
            } else {
                // Si filterType n'est pas défini, utiliser les valeurs des menus déroulants
                if (typeIdFromState) apiParams.typeId = typeIdFromState;
                if (subTypeIdFromState) apiParams.subTypeId = subTypeIdFromState;
            }
            
            console.log("%cParamètres finaux pour la requête API:", "background: #009688; color: white; font-weight: bold; padding: 3px 5px;", apiParams);
            
            const queryString = new URLSearchParams(apiParams).toString();
            console.log("%cURL de la requête envoyée:", "background: #795548; color: white; padding: 3px 5px;", 
                `/resources/?${queryString}`);
                
            const response = await api.get('/resources/', {
                headers: { Authorization: `Bearer ${token}` },
                params: apiParams
            });
            setSearchResults(response.data.items || []);
            setTotalResources(response.data.total || 0);
        } catch (err) {
            console.error("Erreur lors de la recherche de ressources:", err);
            setError('Impossible de charger les ressources. Réessayez plus tard.');
            setSearchResults([]);
            setTotalResources(0);
        } finally {
            setLoading(false);
        }
    }, [resourcesPerPage, filterType]); // filterType ajouté aux dépendances

    // Appliquer le debounce spécifiquement à l'appel déclenché par la recherche textuelle
    const debouncedFetchResources = useMemo(() => _debounce(fetchResources, 500), [fetchResources]);

    // Effet pour recharger les ressources quand les filtres ou la page changent
    useEffect(() => {
        // Éviter l'appel initial redondant si 'open' le gère déjà
        if (open) {
            console.log("%cRechargement des ressources avec filtres changés:", "background: #673ab7; color: white;", {
                page: currentPage,
                searchTerm,
                typeId: selectedTypeId,
                subTypeId: selectedSubTypeId,
                typeFilter: filterType
            });
            // Pas besoin de debounce pour les changements de page/filtres
            fetchResources(currentPage, searchTerm, selectedTypeId, selectedSubTypeId);
        }
    }, [open, currentPage, selectedTypeId, selectedSubTypeId, fetchResources, filterType]); // Ne pas inclure searchTerm ici pour utiliser le debounce

    // Gérer le changement du terme de recherche
    const handleSearchChange = (event) => {
        const newTerm = event.target.value;
        setSearchTerm(newTerm);
        setCurrentPage(1); // Retour à la première page lors d'une nouvelle recherche
        debouncedFetchResources(1, newTerm, selectedTypeId, selectedSubTypeId);
    };

    // Gérer le clic sur une checkbox
    const handleToggle = (resource) => () => {
        const currentIndex = selectedResources.findIndex((res) => res.id === resource.id);
        const newSelectedResources = [...selectedResources];

        if (currentIndex === -1) {
            newSelectedResources.push(resource);
        } else {
            newSelectedResources.splice(currentIndex, 1);
        }

        setSelectedResources(newSelectedResources);
    };

    // Sauvegarder la sélection et fermer le modal
    const handleSaveChanges = () => {
        onSave(selectedResources); // Envoyer la sélection mise à jour au composant parent
        onClose(); // Fermer le modal
    };

    // Gérer le changement de page
    const handlePageChange = (event, value) => {
        setCurrentPage(value);
    };

    // Gérer le changement de type
    const handleTypeChange = (event) => {
        const newTypeId = event.target.value;
        setSelectedTypeId(newTypeId);
        setSelectedSubTypeId(''); // Réinitialiser le sous-type
        setCurrentPage(1); // Retour page 1
        fetchResourceSubTypes(newTypeId); // Charger les nouveaux sous-types
        // fetchResources sera déclenché par le useEffect dépendant de selectedTypeId
    };

     // Gérer le changement de sous-type
    const handleSubTypeChange = (event) => {
        const newSubTypeId = event.target.value;
        setSelectedSubTypeId(newSubTypeId);
        setCurrentPage(1); // Retour page 1
        // fetchResources sera déclenché par le useEffect dépendant de selectedSubTypeId
    };

    // IDs des ressources actuellement sélectionnées (pour vérifier les checkboxes)
    const selectedResourceIds = useMemo(() => new Set(selectedResources.map(res => res.id)), [selectedResources]);
    const pageCount = Math.ceil(totalResources / resourcesPerPage);

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" scroll="paper">
            <DialogTitle sx={{ m: 0, p: 2 }}>
                Sélectionner des Ressources
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
                    label="Rechercher par titre ou description"
                    variant="outlined"
                    value={searchTerm}
                    onChange={handleSearchChange}
                    margin="normal"
                    sx={{ mb: 2 }}
                />
                {/* Filtres Type et Sous-Type */}
                <Grid container spacing={2} sx={{ mb: 2 }}>
                    <Grid item xs={6}>
                        <FormControl fullWidth variant="outlined" size="small" disabled={loadingFilters}>
                            <InputLabel id="resource-type-select-label">Type</InputLabel>
                            <Select
                                labelId="resource-type-select-label"
                                id="resource-type-select"
                                value={selectedTypeId}
                                label="Type"
                                onChange={handleTypeChange}
                            >
                                <MenuItem value="">
                                    <em>Tous les types</em>
                                </MenuItem>
                                {availableTypes.map((type) => (
                                    <MenuItem key={type.id} value={type.id}>{type.value}</MenuItem> // Utiliser type.value ou type.name selon le schéma
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={6}>
                        <FormControl fullWidth variant="outlined" size="small" disabled={!selectedTypeId || loadingFilters}>
                            <InputLabel id="resource-subtype-select-label">Sous-Type</InputLabel>
                            <Select
                                labelId="resource-subtype-select-label"
                                id="resource-subtype-select"
                                value={selectedSubTypeId}
                                label="Sous-Type"
                                onChange={handleSubTypeChange}
                            >
                                <MenuItem value="">
                                    <em>Tous les sous-types</em>
                                </MenuItem>
                                {availableSubTypes.map((subtype) => (
                                    <MenuItem key={subtype.id} value={subtype.id}>{subtype.value}</MenuItem> // Utiliser subtype.value ou subtype.name
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                </Grid>
                {/* Indicateur de chargement pour les filtres */} 
                {loadingFilters && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', my: 1 }}>
                       <Typography variant="caption">Chargement des filtres...</Typography>
                    </Box>
                )}
                {loading && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
                        <CircularProgress />
                    </Box>
                )}
                {error && <Alert severity="error" sx={{ my: 1 }}>{error}</Alert>}
                {!loading && !error && (
                    <List sx={{ width: '100%', maxHeight: 300, overflow: 'auto', bgcolor: 'background.paper' }}>
                        {searchResults.length > 0 ? (
                            searchResults.map((resource) => {
                                const labelId = `checkbox-list-label-${resource.id}`;
                                const isSelected = selectedResourceIds.has(resource.id);
                                return (
                                    <ListItem
                                        key={resource.id}
                                        role={undefined}
                                        dense
                                        button
                                        onClick={handleToggle(resource)}
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
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                                            <ListItemText id={labelId} primary={resource.title} secondary={resource.description || 'Aucune description'} />
                                            <PdfExtractionStatusChip
                                                resourceId={resource.id}
                                                fileType={resource.file_type}
                                                filePath={resource.file_path}
                                                size="small"
                                                autoFetch
                                            />
                                        </Box>
                                    </ListItem>
                                );
                            })
                        ) : (
                            searchTerm && !loading && (
                                <Typography sx={{ textAlign: 'center', color: 'text.secondary', mt: 2 }}>
                                    Aucune ressource trouvée pour "{searchTerm}".
                                </Typography>
                            )
                        )}
                         {!searchTerm && !loading && searchResults.length === 0 && (
                             <Typography sx={{ textAlign: 'center', color: 'text.secondary', mt: 2 }}>
                                 Entrez un terme pour rechercher des ressources.
                            </Typography>
                         )}
                    </List>
                )}
                {!loading && totalResources > 0 && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                        <Pagination
                            count={pageCount}
                            page={currentPage}
                            onChange={handlePageChange}
                            color="primary"
                            disabled={loading}
                        />
                    </Box>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Annuler</Button>
                <Button onClick={handleSaveChanges} variant="contained">
                    Valider la Sélection
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ResourceSelectorModal;
