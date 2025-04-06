import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Grid,
  Card,
  CardContent,
  CardHeader,
  IconButton,
  Alert,
  CircularProgress,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import resourceTypeService from '../../services/resourceTypeService';

/**
 * Composant de formulaire réutilisable pour la création et l'édition de ressources
 * 
 * @param {Object} props - Propriétés du composant
 * @param {boolean} props.open - Indique si le dialogue est ouvert (uniquement en mode dialogue)
 * @param {Function} props.onClose - Fonction appelée à la fermeture du dialogue
 * @param {Object} props.session - Session associée à la ressource (optionnel)
 * @param {boolean} props.isDialog - Indique si le formulaire est affiché dans un dialogue
 * @param {Object} props.initialData - Données initiales pour le formulaire (pour l'édition)
 * @param {boolean} props.isEdit - Indique si le formulaire est en mode édition
 * @param {Function} props.onSuccess - Fonction appelée après une soumission réussie
 * @param {string} props.resourceId - ID de la ressource (pour l'édition)
 */
const ResourceForm = ({ 
  open, 
  onClose, 
  session, 
  isDialog = true, 
  initialData = null,
  isEdit = false,
  onSuccess,
  resourceId
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type_id: '',
    sub_type_id: '',
    content: '',
    session_ids: session ? [session.id] : []
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resourceTypes, setResourceTypes] = useState([]);
  const [resourceSubTypes, setResourceSubTypes] = useState([]);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  // Initialiser le formulaire avec les données existantes en mode édition
  // seulement après que les types ont été chargés
  useEffect(() => {
    if (initialData && resourceTypes.length > 0) {
      // Convertir les types en chaînes pour éviter les erreurs de comparaison
      const typeId = initialData.type_id ? String(initialData.type_id) : '';
      
      setFormData({
        ...initialData,
        // S'assurer que les champs requis sont présents et correctement formatés
        type_id: typeId,
        sub_type_id: initialData.sub_type_id ? String(initialData.sub_type_id) : '',
        session_ids: initialData.session_ids || []
      });
      
      // Déclencher le chargement des sous-types si nécessaire
      if (typeId) {
        resourceTypeService.getSubtypesByType(typeId)
          .then(subTypes => {
            setResourceSubTypes(subTypes);
          })
          .catch(err => {
            console.error('Erreur lors du chargement des sous-types:', err);
          });
      }
    }
  }, [initialData, resourceTypes]);

  // Charger les types de ressources au chargement du composant
  useEffect(() => {
    const fetchResourceTypes = async () => {
      try {
        setLoading(true);
        const types = await resourceTypeService.getAllTypes();
        setResourceTypes(types);
        setLoading(false);
      } catch (err) {
        console.error('Erreur lors du chargement des types de ressources:', err);
        setError('Impossible de charger les types de ressources');
        setLoading(false);
      }
    };

    fetchResourceTypes();
  }, []);

  // Charger les sous-types lorsque le type est sélectionné
  useEffect(() => {
    const fetchSubTypes = async () => {
      if (!formData.type_id) {
        setResourceSubTypes([]);
        return;
      }

      try {
        setLoading(true);
        const subTypes = await resourceTypeService.getSubtypesByType(formData.type_id);
        setResourceSubTypes(subTypes);
        setLoading(false);
      } catch (err) {
        console.error('Erreur lors du chargement des sous-types de ressources:', err);
        setError('Impossible de charger les sous-types de ressources');
        setLoading(false);
      }
    };

    fetchSubTypes();
  }, [formData.type_id]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.type_id || !formData.sub_type_id) {
      setError('Veuillez sélectionner un type et un sous-type de ressource');
      return;
    }

    // Récupérer l'ID de l'utilisateur connecté avant de soumettre le formulaire
    let currentUserId = formData.user_id;
    if (!currentUserId) {
      try {
        const userResponse = await fetch('http://localhost:10000/api/v1/users/me', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (userResponse.ok) {
          const userData = await userResponse.json();
          currentUserId = userData.id;
          console.log('ID utilisateur récupéré:', currentUserId);
        } else {
          setError('Impossible de récupérer les informations de l\'utilisateur');
          setSubmitting(false);
          return;
        }
      } catch (err) {
        setError('Erreur lors de la récupération des informations de l\'utilisateur');
        console.error('Erreur:', err);
        setSubmitting(false);
        return;
      }
    }

    try {
      setSubmitting(true);
      const url = isEdit 
        ? `http://localhost:10000/api/v1/resources/${resourceId}` 
        : 'http://localhost:10000/api/v1/resources';
      
      const method = isEdit ? 'PUT' : 'POST';
      
      // Préparer les données à envoyer
      const dataToSend = {
        title: formData.title,
        description: formData.description || "",
        type_id: parseInt(formData.type_id),
        sub_type_id: parseInt(formData.sub_type_id),
        content: String(formData.content || ""),  // S'assurer que content est une chaîne de caractères
        user_id: parseInt(currentUserId),
        session_ids: Array.isArray(formData.session_ids) ? formData.session_ids.filter(id => id !== null && id !== 0) : []
      };
      
      // Vérifier que les valeurs numériques sont bien des nombres
      if (isNaN(dataToSend.type_id) || isNaN(dataToSend.sub_type_id) || isNaN(dataToSend.user_id)) {
        setError('Les identifiants doivent être des nombres valides');
        setSubmitting(false);
        return;
      }
      
      console.log('Données envoyées à l\'API:', dataToSend);
      
      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(dataToSend)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Réponse d\'erreur de l\'API:', errorData);
        
        // Formater le message d'erreur de manière plus lisible
        let errorMessage = `Erreur lors de ${isEdit ? 'la modification' : 'l\'ajout'} de la ressource`;
        
        if (errorData.detail) {
          if (Array.isArray(errorData.detail)) {
            // Si detail est un tableau, extraire les messages
            const detailMessages = errorData.detail.map(item => {
              if (typeof item === 'object') {
                return `${item.loc ? item.loc.join('.') + ': ' : ''}${item.msg || JSON.stringify(item)}`;
              }
              return item;
            });
            errorMessage += ': ' + detailMessages.join(', ');
          } else if (typeof errorData.detail === 'object') {
            // Si detail est un objet
            errorMessage += ': ' + JSON.stringify(errorData.detail);
          } else {
            // Si detail est une chaîne simple
            errorMessage += ': ' + errorData.detail;
          }
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      setSuccess(`Ressource ${isEdit ? 'modifiée' : 'ajoutée'} avec succès`);
      
      // Appeler le callback de succès si fourni
      if (onSuccess) {
        onSuccess(data);
      }
      
      // Fermer le dialogue si en mode dialogue
      if (isDialog && onClose) {
        setTimeout(() => onClose(), 1500);
      }
      
      // Rediriger si pas en mode dialogue
      if (!isDialog) {
        setTimeout(() => navigate('/resources'), 1500);
      }
    } catch (err) {
      setError(err.message || 'Une erreur est survenue');
      console.error(`Erreur lors de ${isEdit ? 'la modification' : 'l\'ajout'} de la ressource:`, err);
    } finally {
      setSubmitting(false);
    }
  };

  // Contenu du formulaire partagé entre les modes dialogue et page
  const formContent = (
    <>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Titre"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            required
            disabled={submitting}
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            multiline
            rows={3}
            disabled={submitting}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel id="type-label">Type de ressource</InputLabel>
            <Select
              labelId="type-label"
              name="type_id"
              value={formData.type_id || ''}
              onChange={handleInputChange}
              label="Type de ressource"
              required
              disabled={loading || resourceTypes.length === 0 || submitting}
            >
              {resourceTypes.map((type) => (
                <MenuItem key={type.id} value={String(type.id)}>
                  {type.value}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel id="subtype-label">Sous-type de ressource</InputLabel>
            <Select
              labelId="subtype-label"
              name="sub_type_id"
              value={formData.sub_type_id || ''}
              onChange={handleInputChange}
              label="Sous-type de ressource"
              required
              disabled={loading || !formData.type_id || resourceSubTypes.length === 0 || submitting}
            >
              {resourceSubTypes.map((subType) => (
                <MenuItem key={subType.id} value={String(subType.id)}>
                  {subType.value}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Contenu"
            name="content"
            value={formData.content}
            onChange={handleInputChange}
            multiline
            rows={4}
            disabled={submitting}
          />
        </Grid>
      </Grid>
    </>
  );
  
  // Boutons d'action partagés
  const actionButtons = (
    <>
      <Button 
        onClick={isDialog ? onClose : () => navigate(-1)} 
        color="primary" 
        disabled={submitting}
      >
        Annuler
      </Button>
      <Button 
        type="submit" 
        variant="contained" 
        color="primary" 
        disabled={submitting}
        startIcon={submitting ? <CircularProgress size={20} /> : null}
      >
        {isEdit ? 'Modifier' : 'Ajouter'}
      </Button>
    </>
  );

  // Rendu en mode dialogue
  if (isDialog) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>
          {isEdit ? 'Modifier la ressource' : 'Ajouter une nouvelle ressource'}
          <IconButton
            aria-label="close"
            onClick={onClose}
            sx={{ position: 'absolute', right: 8, top: 8 }}
            disabled={submitting}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        
        <form onSubmit={handleSubmit}>
          <DialogContent>
            {formContent}
          </DialogContent>

          <DialogActions>
            {actionButtons}
          </DialogActions>
        </form>
      </Dialog>
    );
  }

  // Rendu en mode page
  return (
    <Box sx={{ p: 3 }}>
      <Card>
        <CardHeader title={isEdit ? 'Modifier la ressource' : 'Ajouter une nouvelle ressource'} />
        <CardContent>
          <form onSubmit={handleSubmit}>
            {formContent}
            
            <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
              {actionButtons}
            </Box>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ResourceForm;
