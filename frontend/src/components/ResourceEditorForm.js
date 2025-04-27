import React, { useState, useEffect } from 'react';
import { 
  Box, 
  TextField, 
  Button, 
  Typography, 
  Accordion, 
  AccordionSummary, 
  AccordionDetails,
  Divider,
  IconButton,
  Paper,
  Grid
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { FormControlLabel, Checkbox } from '@mui/material';

/**
 * ResourceEditorForm génère dynamiquement un formulaire
 * à partir d'un objet JSON initial, permettant à l'utilisateur
 * de modifier chaque propriété avant la fusion HTML.
 * Gère également les objets et tableaux imbriqués.
 */
const ResourceEditorForm = ({ initialData, onSubmit, onCancel, onChange, hideButtons = false }) => {
  const [formData, setFormData] = useState(initialData);
  
  // Mise à jour du formData quand initialData change (navigation entre documents)
  useEffect(() => {
    setFormData(initialData);
  }, [initialData]);

  // Garantir que la structure initiale contient les tableaux requis
  useEffect(() => {
    // Fonction récursive pour initialiser les tableaux manquants
    const initializeArrays = (obj) => {
      if (!obj || typeof obj !== 'object') return obj;
      
      // Copier l'objet pour éviter de modifier l'original directement
      const newObj = Array.isArray(obj) ? [...obj] : {...obj};
      
      // Si c'est un objet qui semble être une question sans options
      if (newObj.hasOwnProperty('question') && !newObj.hasOwnProperty('options')) {
        console.log("Initialisation du tableau 'options' pour:", newObj);
        newObj.options = [];
      }
      
      // Pour chaque propriété qui est un objet, appliquer récursivement
      Object.keys(newObj).forEach(key => {
        if (typeof newObj[key] === 'object' && newObj[key] !== null) {
          newObj[key] = initializeArrays(newObj[key]);
        }
      });
      
      return newObj;
    };
    
    // Initialiser toute la structure de données
    const initializedData = initializeArrays(formData);
    
    // Ne mettre à jour que si des modifications ont été apportées
    if (JSON.stringify(initializedData) !== JSON.stringify(formData)) {
      console.log("Structure de données mise à jour avec tableaux initialisés");
      setFormData(initializedData);
      
      // Propager les modifications si nécessaire
      if (onChange) {
        onChange(initializedData);
      }
    }
  }, []); // Exécuter uniquement au montage du composant

  // Gestion des changements pour les champs simples
  const handleChange = (key) => (e) => {
    const newFormData = {
      ...formData,
      [key]: e.target.value,
    };
    setFormData(newFormData);
    
    // Notifier le parent des modifications en cours
    if (onChange) {
      onChange(newFormData);
    }
  };

  // Gestion des changements pour les objets imbriqués
  const handleNestedChange = (key, nestedKey, value, index = null) => {
    let newFormData = { ...formData };
    console.log("handleNestedChange appelé avec:", { key, nestedKey, value, index });
    
    // IMPORTANT: Vérification spécifique pour 'options' 
    // Si on essaie d'accéder à 'options' mais que ce n'est pas un tableau, l'initialiser
    if ((key === 'options' || key.endsWith('.options') || key.includes('.options[')) && 
        (newFormData[key] === undefined || !Array.isArray(newFormData[key]))) {
      console.log(`Initialisation forcée de 'options' pour la clé '${key}'`);
      
      // Selon la structure de la clé, initialiser options au bon endroit
      if (key === 'options') {
        newFormData.options = [];
      } else if (key.includes('.')) {
        // Pour les options imbriquées, créer la structure complète
        const parts = key.split('.');
        let current = newFormData;
        
        // Parcourir le chemin jusqu'à options
        for (let i = 0; i < parts.length - 1; i++) {
          const part = parts[i];
          if (part.includes('[')) {
            const arrName = part.substring(0, part.indexOf('['));
            const arrIndex = parseInt(part.substring(part.indexOf('[') + 1, part.indexOf(']')));
            
            if (!current[arrName]) current[arrName] = [];
            if (!current[arrName][arrIndex]) current[arrName][arrIndex] = {};
            current = current[arrName][arrIndex];
          } else {
            if (!current[part]) current[part] = {};
            current = current[part];
          }
        }
        
        // Initialiser le tableau options
        const lastPart = parts[parts.length - 1];
        if (lastPart === 'options' || lastPart.startsWith('options[')) {
          if (lastPart === 'options') {
            current.options = [];
          } else if (lastPart.startsWith('options[')) {
            if (!current.options) current.options = [];
          }
        }
      }
    }
    
    // Suite du code existant pour le traitement des clés composées
    if (key.includes('.') || key.includes('[')) {
      // Parse le chemin d'accès complexe
      const parts = key.split('.');
      let current = newFormData;
      
      // Parcourir toutes les parties du chemin sauf la dernière
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        // Gérer la notation d'indice de tableau: "array[0]"
        if (part.includes('[')) {
          const arrName = part.substring(0, part.indexOf('['));
          const arrIndex = parseInt(part.substring(part.indexOf('[') + 1, part.indexOf(']')));
          
          // Initialiser le tableau si nécessaire
          if (!current[arrName] || !Array.isArray(current[arrName])) {
            console.log(`Initialisation de tableau pour '${arrName}' à l'indice ${i} du chemin`);
            current[arrName] = [];
          }
          
          // Initialiser l'élément du tableau si nécessaire
          if (!current[arrName][arrIndex]) {
            console.log(`Initialisation d'élément de tableau pour '${arrName}[${arrIndex}]'`);
            current[arrName][arrIndex] = {};
          }
          
          current = current[arrName][arrIndex];
        } else {
          // Gérer les objets standard
          if (!current[part] || typeof current[part] !== 'object' || Array.isArray(current[part])) {
            console.log(`Initialisation d'objet pour '${part}' à l'indice ${i} du chemin`);
            current[part] = {};
          }
          current = current[part];
        }
      }
      
      // Obtenir la dernière partie du chemin (la clé finale)
      const lastPart = parts[parts.length - 1];
      
      // Gérer la dernière partie si c'est un indice de tableau
      if (lastPart.includes('[')) {
        const arrName = lastPart.substring(0, lastPart.indexOf('['));
        const arrIndex = parseInt(lastPart.substring(lastPart.indexOf('[') + 1, lastPart.indexOf(']')));
        
        // Initialiser le tableau si nécessaire
        if (!current[arrName] || !Array.isArray(current[arrName])) {
          console.log(`Initialisation de tableau pour '${arrName}' à la fin du chemin`);
          current[arrName] = [];
        }
        
        // Modifier la valeur dans le tableau
        if (nestedKey) {
          // S'assurer que l'élément existe et est un objet
          if (!current[arrName][arrIndex] || typeof current[arrName][arrIndex] !== 'object') {
            console.log(`Initialisation d'objet pour '${arrName}[${arrIndex}]'`);
            current[arrName][arrIndex] = {};
          }
          current[arrName][arrIndex][nestedKey] = value;
        } else {
          current[arrName][arrIndex] = value;
        }
      } else {
        // Modifier la valeur d'un objet simple
        if (nestedKey) {
          // S'assurer que l'objet existe
          if (!current[lastPart] || typeof current[lastPart] !== 'object') {
            console.log(`Initialisation d'objet pour '${lastPart}'`);
            current[lastPart] = {};
          }
          current[lastPart][nestedKey] = value;
        } else {
          current[lastPart] = value;
        }
      }
    } else {
      // Cas simple pour les clés non composées
      if (index !== null) {
        // C'est un élément de tableau
        // Vérifier que newFormData[key] est bien un tableau avant de faire un spread
        if (!Array.isArray(newFormData[key])) {
          console.error(`La clé '${key}' n'est pas un tableau:`, newFormData[key]);
          // Initialiser comme un tableau vide si ce n'est pas un tableau
          newFormData[key] = [];
          return; // Sortir pour éviter d'autres erreurs
        }
        
        const newArray = [...newFormData[key]];
        
        if (nestedKey) {
          // Assurer que l'index existe et est un objet
          if (!newArray[index] || typeof newArray[index] !== 'object') {
            console.log(`Initialisation d'objet pour '${key}[${index}]'`);
            newArray[index] = {};
          }
          
          newArray[index] = {
            ...newArray[index],
            [nestedKey]: value
          };
        } else {
          newArray[index] = value;
        }
        
        newFormData[key] = newArray;
      } else if (nestedKey) {
        // C'est un champ dans un objet
        // Vérifier que newFormData[key] est bien un objet
        if (!newFormData[key] || typeof newFormData[key] !== 'object' || Array.isArray(newFormData[key])) {
          console.error(`La clé '${key}' n'est pas un objet:`, newFormData[key]);
          // Initialiser comme un objet vide si ce n'est pas un objet
          newFormData[key] = {};
        }
        
        newFormData[key] = {
          ...newFormData[key],
          [nestedKey]: value
        };
      }
    }
    
    // Ajouter des logs de débogage
    console.log('Modification:', { key, nestedKey, value, index, formData: newFormData });
    
    setFormData(newFormData);
    
    if (onChange) {
      onChange(newFormData);
    }
  };

  // Cas particulier : traitement des champs de l'objet options
  const handleOptionsChange = (itemKey, optionIdx, field, value) => {
    console.log(`Modification d'une option: ${itemKey}, option ${optionIdx}, champ ${field}, valeur:`, value);
    
    // Accès aux options via un chemin complet
    const optionsPath = itemKey.includes('.') ? `${itemKey}.options[${optionIdx}].${field}` : `options[${optionIdx}].${field}`;
    const optionsParentPath = itemKey.includes('.') ? `${itemKey}.options` : 'options';
    
    let newFormData = {...formData};
    let parentObj = newFormData;
    
    // Naviguer vers le parent des options
    if (itemKey.includes('.')) {
      const parts = itemKey.split('.');
      for (const part of parts) {
        if (part.includes('[')) {
          const arrName = part.substring(0, part.indexOf('['));
          const arrIdx = parseInt(part.substring(part.indexOf('[') + 1, part.indexOf(']')));
          
          if (!parentObj[arrName]) parentObj[arrName] = [];
          if (!parentObj[arrName][arrIdx]) parentObj[arrName][arrIdx] = {};
          parentObj = parentObj[arrName][arrIdx];
        } else {
          if (!parentObj[part]) parentObj[part] = {};
          parentObj = parentObj[part];
        }
      }
    }
    
    // S'assurer que options existe
    if (!parentObj.options) {
      parentObj.options = [];
    }
    
    // S'assurer que l'option existe
    if (!parentObj.options[optionIdx]) {
      parentObj.options[optionIdx] = { id: String(Date.now()) };
    }
    
    // Modifier le champ spécifique
    parentObj.options[optionIdx][field] = value;
    
    console.log("Structure mise à jour:", newFormData);
    setFormData(newFormData);
    
    if (onChange) {
      onChange(newFormData);
    }
  };

  // Rendu d'une option de QCM - version simplifiée et sécurisée
  const renderSimpleOption = (option, optionIdx, parentPath = '') => {
    if (!option || typeof option !== 'object') {
      console.error("Option invalide:", option);
      return null;
    }
    
    const handleOptionTextChange = (e) => {
      const newFormData = {...formData};
      if (!parentPath) {
        // Options directement dans la racine
        if (!newFormData.options) newFormData.options = [];
        if (!newFormData.options[optionIdx]) newFormData.options[optionIdx] = {};
        
        // Déterminer quel champ utiliser
        if ('texte' in option) {
          newFormData.options[optionIdx].texte = e.target.value;
        } else {
          newFormData.options[optionIdx].text = e.target.value;
        }
      } else {
        // Options dans un objet imbriqué
        try {
          // Récupérer l'objet parent
          let obj = newFormData;
          const path = parentPath.split('.');
          
          // Naviguer dans l'objet
          for (const part of path) {
            if (part.includes('[')) {
              const name = part.substring(0, part.indexOf('['));
              const index = parseInt(part.substring(part.indexOf('[') + 1, part.indexOf(']')));
              
              if (!obj[name]) obj[name] = [];
              if (!obj[name][index]) obj[name][index] = {};
              obj = obj[name][index];
            } else {
              if (!obj[part]) obj[part] = {};
              obj = obj[part];
            }
          }
          
          // Modifier l'option
          if (!obj.options) obj.options = [];
          if (!obj.options[optionIdx]) obj.options[optionIdx] = {};
          
          // Déterminer quel champ utiliser
          if ('texte' in option) {
            obj.options[optionIdx].texte = e.target.value;
          } else {
            obj.options[optionIdx].text = e.target.value;
          }
        } catch (error) {
          console.error("Erreur lors de la modification de l'option:", error);
        }
      }
      
      setFormData(newFormData);
      if (onChange) onChange(newFormData);
    };
    
    const handleOptionIsCorrectChange = (e) => {
      const newFormData = {...formData};
      if (!parentPath) {
        // Options directement dans la racine
        if (!newFormData.options) newFormData.options = [];
        if (!newFormData.options[optionIdx]) newFormData.options[optionIdx] = {};
        newFormData.options[optionIdx].isCorrect = e.target.checked;
      } else {
        // Options dans un objet imbriqué
        try {
          // Récupérer l'objet parent
          let obj = newFormData;
          const path = parentPath.split('.');
          
          // Naviguer dans l'objet
          for (const part of path) {
            if (part.includes('[')) {
              const name = part.substring(0, part.indexOf('['));
              const index = parseInt(part.substring(part.indexOf('[') + 1, part.indexOf(']')));
              
              if (!obj[name]) obj[name] = [];
              if (!obj[name][index]) obj[name][index] = {};
              obj = obj[name][index];
            } else {
              if (!obj[part]) obj[part] = {};
              obj = obj[part];
            }
          }
          
          // Modifier l'option
          if (!obj.options) obj.options = [];
          if (!obj.options[optionIdx]) obj.options[optionIdx] = {};
          obj.options[optionIdx].isCorrect = e.target.checked;
        } catch (error) {
          console.error("Erreur lors de la modification de l'option:", error);
        }
      }
      
      setFormData(newFormData);
      if (onChange) onChange(newFormData);
    };
    
    const handleRemoveOption = () => {
      const newFormData = {...formData};
      if (!parentPath) {
        // Options directement dans la racine
        if (!newFormData.options || !Array.isArray(newFormData.options)) return;
        newFormData.options = newFormData.options.filter((_, idx) => idx !== optionIdx);
      } else {
        // Options dans un objet imbriqué
        try {
          // Récupérer l'objet parent
          let obj = newFormData;
          const path = parentPath.split('.');
          
          // Naviguer dans l'objet
          for (const part of path) {
            if (part.includes('[')) {
              const name = part.substring(0, part.indexOf('['));
              const index = parseInt(part.substring(part.indexOf('[') + 1, part.indexOf(']')));
              
              if (!obj[name]) return;
              if (!obj[name][index]) return;
              obj = obj[name][index];
            } else {
              if (!obj[part]) return;
              obj = obj[part];
            }
          }
          
          // Supprimer l'option
          if (!obj.options || !Array.isArray(obj.options)) return;
          obj.options = obj.options.filter((_, idx) => idx !== optionIdx);
        } catch (error) {
          console.error("Erreur lors de la suppression de l'option:", error);
        }
      }
      
      setFormData(newFormData);
      if (onChange) onChange(newFormData);
    };
    
    return (
      <Box sx={{ ml: 2, mb: 1, p: 1, border: '1px solid #eee', borderRadius: 1 }} key={`option-${optionIdx}`}>
        <Grid container spacing={2}>
          <Grid item xs={8}>
            <TextField
              label="Texte de l'option"
              value={option.texte || option.text || ''}
              onChange={handleOptionTextChange}
              fullWidth
              size="small"
            />
          </Grid>
          <Grid item xs={3}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={!!option.isCorrect}
                  onChange={handleOptionIsCorrectChange}
                />
              }
              label="Correcte"
            />
          </Grid>
          <Grid item xs={1}>
            <IconButton 
              size="small" 
              color="error"
              onClick={handleRemoveOption}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Grid>
        </Grid>
      </Box>
    );
  };

  // Fonctions utilitaires pour accéder aux valeurs imbriquées
  const getNestedValue = (obj, path) => {
    if (!path) return obj;
    
    const parts = path.split('.');
    let current = obj;
    
    for (const part of parts) {
      if (part.includes('[')) {
        const arrName = part.substring(0, part.indexOf('['));
        const arrIdx = parseInt(part.substring(part.indexOf('[') + 1, part.indexOf(']')));
        
        if (!current[arrName] || !Array.isArray(current[arrName]) || !current[arrName][arrIdx]) {
          return undefined;
        }
        
        current = current[arrName][arrIdx];
      } else {
        if (!current[part]) return undefined;
        current = current[part];
      }
    }
    
    return current;
  };
  
  // Fonction pour définir une valeur dans un chemin imbriqué
  const setNestedValue = (obj, path, value) => {
    if (!path) return;
    
    const parts = path.split('.');
    let current = obj;
    
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      
      if (part.includes('[')) {
        const arrName = part.substring(0, part.indexOf('['));
        const arrIdx = parseInt(part.substring(part.indexOf('[') + 1, part.indexOf(']')));
        
        if (!current[arrName]) current[arrName] = [];
        if (!current[arrName][arrIdx]) current[arrName][arrIdx] = {};
        
        current = current[arrName][arrIdx];
      } else {
        if (!current[part]) current[part] = {};
        current = current[part];
      }
    }
    
    const lastPart = parts[parts.length - 1];
    if (lastPart.includes('[')) {
      const arrName = lastPart.substring(0, lastPart.indexOf('['));
      const arrIdx = parseInt(lastPart.substring(lastPart.indexOf('[') + 1, lastPart.indexOf(']')));
      
      if (!current[arrName]) current[arrName] = [];
      current[arrName][arrIdx] = value;
    } else {
      current[lastPart] = value;
    }
  };

  // Ajouter un élément à un tableau
  const handleAddItem = (key) => {
    console.log("Ajout d'élément à la clé:", key);
    
    // Traitement des clés composées (avec notation "parent.enfant" ou "array[0].field")
    if (key.includes('.') || key.includes('[')) {
      // Parse le chemin d'accès complexe
      const parts = key.split('.');
      let current = {...formData};
      const path = [];
      
      // Parcourir toutes les parties du chemin sauf la dernière
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        path.push(part);
        
        // Gérer la notation d'indice de tableau: "array[0]"
        if (part.includes('[')) {
          const arrName = part.substring(0, part.indexOf('['));
          const arrIdx = parseInt(part.substring(part.indexOf('[') + 1, part.indexOf(']')));
          path.pop(); // Enlever la partie avec l'indice
          path.push(arrName); // Ajouter juste le nom du tableau
          
          // Naviguer à travers l'objet
          let tempCurrent = current;
          for (let j = 0; j < path.length - 1; j++) {
            if (!tempCurrent[path[j]]) tempCurrent[path[j]] = {};
            tempCurrent = tempCurrent[path[j]];
          }
          
          // Initialiser le tableau si nécessaire
          if (!tempCurrent[arrName]) tempCurrent[arrName] = [];
          
          // Initialiser l'élément du tableau si nécessaire
          if (!tempCurrent[arrName][arrIdx]) tempCurrent[arrName][arrIdx] = {};
          
          path.push(arrIdx); // Ajouter l'indice
        }
        
        // Naviguer à travers l'objet
        let tempCurrent = current;
        for (let j = 0; j < path.length - 1; j++) {
          if (!tempCurrent[path[j]]) tempCurrent[path[j]] = {};
          tempCurrent = tempCurrent[path[j]];
        }
        
        // S'assurer que la structure existe
        const lastPathPart = path[path.length - 1];
        if (typeof lastPathPart === 'number') {
          // C'est un index de tableau
          const arrName = path[path.length - 2];
          if (!tempCurrent[arrName]) tempCurrent[arrName] = [];
          if (!tempCurrent[arrName][lastPathPart]) tempCurrent[arrName][lastPathPart] = {};
        } else {
          // C'est une propriété d'objet
          if (!tempCurrent[lastPathPart]) tempCurrent[lastPathPart] = {};
        }
      }
      
      // Obtenir la dernière partie du chemin (la clé finale)
      const lastPart = parts[parts.length - 1];
      path.push(lastPart);
      
      // Naviguer jusqu'au parent final
      let tempCurrent = current;
      for (let j = 0; j < path.length - 1; j++) {
        if (!tempCurrent[path[j]]) {
          if (typeof path[j+1] === 'number') {
            tempCurrent[path[j]] = [];
          } else {
            tempCurrent[path[j]] = {};
          }
        }
        tempCurrent = tempCurrent[path[j]];
      }
      
      // Gérer la dernière partie si c'est un indice de tableau
      if (lastPart.includes('[')) {
        const arrName = lastPart.substring(0, lastPart.indexOf('['));
        const arrIdx = parseInt(lastPart.substring(lastPart.indexOf('[') + 1, lastPart.indexOf(']')));
        
        // Initialiser le tableau si nécessaire
        if (!tempCurrent[arrName]) tempCurrent[arrName] = [];
        
        // Créer le nouvel élément à ajouter
        let newItem;
        
        // Structure par défaut basée sur le nom
        if (arrName === 'options' || arrName === 'choices') {
          newItem = { 
            id: String(Date.now()), 
            text: '',
            isCorrect: false 
          };
        } else if (arrName === 'questions') {
          newItem = { 
            id: String(Date.now()),
            question: '',
            options: []
          };
        } else if (tempCurrent[arrName].length > 0) {
          // Se baser sur le premier élément s'il existe
          const template = tempCurrent[arrName][0];
          newItem = createEmptyObjectFromTemplate(template);
        } else {
          newItem = {};
        }
        
        // Ajouter le nouvel élément
        tempCurrent[arrName].push(newItem);
      } else {
        // C'est une propriété standard, initialiser comme tableau si nécessaire
        if (!tempCurrent[lastPart]) tempCurrent[lastPart] = [];
        
        // Créer le nouvel élément à ajouter
        let newItem;
        
        // Structure par défaut basée sur le nom
        if (lastPart === 'options' || lastPart === 'choices') {
          newItem = { 
            id: String(Date.now()), 
            text: '',
            isCorrect: false 
          };
        } else if (lastPart === 'questions') {
          newItem = { 
            id: String(Date.now()),
            question: '',
            options: []
          };
        } else if (tempCurrent[lastPart].length > 0) {
          // Se baser sur le premier élément s'il existe
          const template = tempCurrent[lastPart][0];
          newItem = createEmptyObjectFromTemplate(template);
        } else {
          newItem = {};
        }
        
        // Ajouter le nouvel élément
        tempCurrent[lastPart].push(newItem);
      }
      
      // Mettre à jour le formulaire
      setFormData(current);
      
      if (onChange) {
        onChange(current);
      }
      
      return;
    }
    
    // Traitement standard pour les clés simples
    const currentArray = Array.isArray(formData[key]) ? formData[key] : [];
    let newItem;
    
    // Créer un nouvel élément basé sur la structure existante
    if (currentArray.length > 0) {
      // Utiliser le premier élément comme modèle
      const template = currentArray[0];
      newItem = createEmptyObjectFromTemplate(template);
    } else {
      // Si le tableau est vide, créer un modèle typique basé sur le nom de la clé
      if (key === 'options' || key === 'choices') {
        // Pour un tableau d'options/choix de QCM
        newItem = { 
          id: String(Date.now()), 
          text: '',
          isCorrect: false 
        };
      } else if (key === 'questions') {
        // Pour un tableau de questions
        newItem = { 
          id: String(Date.now()),
          question: '',
          options: []
        };
      } else {
        // Structure par défaut pour les autres cas
        newItem = {};
      }
    }
    
    const newArray = [...currentArray, newItem];
    const newFormData = {
      ...formData,
      [key]: newArray
    };
    
    setFormData(newFormData);
    
    if (onChange) {
      onChange(newFormData);
    }
  };
  
  // Supprimer un élément d'un tableau
  const handleRemoveItem = (key, index) => {
    console.log("Suppression d'élément à la clé:", key, "index:", index);
    
    // Traitement des clés composées (avec notation "parent.enfant" ou "array[0].field")
    if (key.includes('.') || key.includes('[')) {
      // Parse le chemin d'accès complexe
      const parts = key.split('.');
      let current = {...formData};
      const path = [];
      
      // Parcourir toutes les parties du chemin sauf la dernière
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        
        // Gérer la notation d'indice de tableau: "array[0]"
        if (part.includes('[')) {
          const arrName = part.substring(0, part.indexOf('['));
          const arrIdx = parseInt(part.substring(part.indexOf('[') + 1, part.indexOf(']')));
          
          // Naviguer à travers l'objet
          if (!current[arrName]) return; // Le tableau n'existe pas
          if (!Array.isArray(current[arrName])) return; // Ce n'est pas un tableau
          if (!current[arrName][arrIdx]) return; // L'élément n'existe pas
          
          current = current[arrName][arrIdx];
        } else {
          // Gérer les objets standard
          if (!current[part] || typeof current[part] !== 'object') return;
          current = current[part];
        }
      }
      
      // Obtenir la dernière partie du chemin (la clé finale)
      const lastPart = parts[parts.length - 1];
      
      // Gérer la dernière partie si c'est un indice de tableau
      if (lastPart.includes('[')) {
        const arrName = lastPart.substring(0, lastPart.indexOf('['));
        
        // Vérifier si le tableau existe
        if (!current[arrName] || !Array.isArray(current[arrName])) return;
        
        // Supprimer l'élément
        const newArray = [...current[arrName]];
        newArray.splice(index, 1);
        current[arrName] = newArray;
      } else {
        // Vérifier si le tableau existe
        if (!current[lastPart] || !Array.isArray(current[lastPart])) return;
        
        // Supprimer l'élément
        const newArray = [...current[lastPart]];
        newArray.splice(index, 1);
        current[lastPart] = newArray;
      }
      
      // Mettre à jour le formulaire
      setFormData(current);
      
      if (onChange) {
        onChange(current);
      }
      
      return;
    }
    
    // Cas simple pour les clés directes
    if (!formData[key] || !Array.isArray(formData[key])) {
      console.error(`La clé '${key}' n'est pas un tableau:`, formData[key]);
      return;
    }
    
    const newArray = [...formData[key]];
    newArray.splice(index, 1);
    
    const newFormData = {
      ...formData,
      [key]: newArray
    };
    
    setFormData(newFormData);
    
    if (onChange) {
      onChange(newFormData);
    }
  };

  // Fonction utilitaire pour créer un objet vide basé sur un modèle
  const createEmptyObjectFromTemplate = (template) => {
    if (typeof template !== 'object' || template === null) {
      return typeof template === 'string' ? '' : 
             typeof template === 'number' ? 0 : 
             typeof template === 'boolean' ? false : 
             null;
    }
    
    if (Array.isArray(template)) {
      return [];
    }
    
    // Copier la structure mais réinitialiser les valeurs
    return Object.keys(template).reduce((obj, k) => {
      if (Array.isArray(template[k])) {
        obj[k] = [];
      } else if (typeof template[k] === 'object' && template[k] !== null) {
        obj[k] = {};
      } else if (typeof template[k] === 'boolean') {
        obj[k] = false;
      } else if (typeof template[k] === 'number') {
        obj[k] = 0;
      } else {
        obj[k] = '';
      }
      return obj;
    }, {});
  };

  // Rendu récursif pour les objets imbriqués
  const renderNestedObject = (obj, parentKey, index = null) => {
    if (!obj || typeof obj !== 'object') return null;

    // Initialisation proactive des tableaux pour les clés connues
    if (obj.hasOwnProperty('question') && !obj.hasOwnProperty('options')) {
      obj.options = [];
      console.log("Initialisation proactive de 'options' pour:", obj);
    }

    // Corriger les références à arrIndex qui doivent être arrIdx
    if (typeof index === 'number' && obj.hasOwnProperty('options') && Array.isArray(obj.options)) {
      console.log(`Rendu direct des options du parent ${parentKey}[${index}]`);
      // Traitement spécial pour les options
      return (
        <Box sx={{ pl: 2, pt: 1, pb: 1 }}>
          {Object.keys(obj).map((key) => {
            const value = obj[key];
            const fullKey = index !== null ? `${parentKey}[${index}].${key}` : `${parentKey}.${key}`;
            
            // Afficher et permettre l'édition de la question
            if (key === 'question' || key === 'texte' || key === 'text') {
              return (
                <Box key={fullKey} sx={{ mb: 2 }}>
                  <TextField
                    label="Question"
                    value={value || ''}
                    onChange={(e) => {
                      // Mettre à jour directement la valeur
                      let newFormData = {...formData};
                      let parent = newFormData;
                      const optionsPath = index !== null ? `${parentKey}[${index}]` : '';
                      
                      try {
                        if (optionsPath) {
                          const parts = optionsPath.split('.');
                          for (const part of parts) {
                            if (part.includes('[')) {
                              const arrName = part.substring(0, part.indexOf('['));
                              const arrIdx = parseInt(part.substring(part.indexOf('[') + 1, part.indexOf(']')));
                              
                              if (!parent[arrName]) parent[arrName] = [];
                              if (!parent[arrName][arrIdx]) parent[arrName][arrIdx] = {};
                              parent = parent[arrName][arrIdx];
                            } else {
                              if (!parent[part]) parent[part] = {};
                              parent = parent[part];
                            }
                          }
                        }
                        
                        parent[key] = e.target.value;
                        
                        setFormData(newFormData);
                        if (onChange) onChange(newFormData);
                      } catch (error) {
                        console.error("Erreur lors de la modification de la question:", error);
                      }
                    }}
                    fullWidth
                    multiline
                    rows={2}
                    sx={{ mb: 2 }}
                  />
                </Box>
              );
            }
            
            if (key === 'options' && Array.isArray(value)) {
              // Cas spécial des options
              return (
                <Box key={fullKey} sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
                    Options ({value.length} éléments)
                    <IconButton 
                      size="small" 
                      color="primary" 
                      onClick={(e) => {
                        e.stopPropagation();
                        const newOption = { 
                          id: String(Date.now()), 
                          texte: '',
                          isCorrect: false 
                        };
                        
                        let newFormData = {...formData};
                        const optionsPath = index !== null ? `${parentKey}[${index}]` : '';
                        
                        try {
                          let parent = newFormData;
                          if (optionsPath) {
                            const parts = optionsPath.split('.');
                            for (const part of parts) {
                              if (part.includes('[')) {
                                const arrName = part.substring(0, part.indexOf('['));
                                const arrIdx = parseInt(part.substring(part.indexOf('[') + 1, part.indexOf(']')));
                                
                                if (!parent[arrName]) parent[arrName] = [];
                                if (!parent[arrName][arrIdx]) parent[arrName][arrIdx] = {};
                                parent = parent[arrName][arrIdx];
                              } else {
                                if (!parent[part]) parent[part] = {};
                                parent = parent[part];
                              }
                            }
                          }
                          
                          if (!parent.options) parent.options = [];
                          parent.options.push(newOption);
                          console.log("Nouvelle option ajoutée:", parent.options);
                          
                          setFormData(newFormData);
                          if (onChange) onChange(newFormData);
                        } catch (error) {
                          console.error("Erreur lors de l'ajout d'option:", error);
                        }
                      }}
                      sx={{ ml: 1 }}
                    >
                      <AddIcon fontSize="small" />
                    </IconButton>
                  </Typography>
                  
                  {value.map((item, idx) => {
                    // Vérifier que l'élément est valide avant de le rendre
                    if (!item || typeof item !== 'object') {
                      console.error(`Option invalide à l'index ${idx}:`, item);
                      return null;
                    }
                    return renderSimpleOption(item, idx, index !== null ? `${parentKey}[${index}]` : '');
                  })}
                </Box>
              );
            } else if (Array.isArray(value)) {
              // Autre tableau
              return (
                <Box key={fullKey} sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
                    {key} ({value.length} éléments)
                    <IconButton 
                      size="small" 
                      color="primary" 
                      onClick={(e) => {
                        e.stopPropagation();
                        // Utiliser le chemin complet pour l'ajout d'éléments imbriqués
                        const nestedKey = index !== null ? `${parentKey}[${index}].${key}` : key;
                        handleAddItem(nestedKey);
                      }}
                      sx={{ ml: 1 }}
                    >
                      <AddIcon fontSize="small" />
                    </IconButton>
                  </Typography>
                  
                  {value.map((item, idx) => (
                    <Accordion key={`${fullKey}[${idx}]`} sx={{ mb: 1 }}>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography>
                          Élément {idx + 1}
                          {typeof item === 'object' && item !== null && (item.texte || item.text) ? ` - ${(item.texte || item.text).substring(0, 30)}...` : ''}
                        </Typography>
                        <IconButton 
                          size="small" 
                          color="error" 
                          onClick={(e) => {
                            e.stopPropagation();
                            // Utiliser le chemin complet pour la suppression d'éléments imbriqués
                            const nestedKey = index !== null ? `${parentKey}[${index}].${key}` : key;
                            handleRemoveItem(nestedKey, idx);
                          }}
                          sx={{ ml: 'auto' }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </AccordionSummary>
                      <AccordionDetails>
                        {typeof item === 'object' && item !== null
                          ? renderNestedObject(item, `${parentKey}[${index}].${key}`, idx)
                          : (
                            <TextField
                              label={`${key}[${idx}]`}
                              value={item || ''}
                              onChange={(e) => handleNestedChange(`${parentKey}[${index}].${key}`, null, e.target.value, idx)}
                              fullWidth
                              multiline={typeof item === 'string' && item.length > 100}
                              sx={{ mb: 1 }}
                            />
                          )
                        }
                      </AccordionDetails>
                    </Accordion>
                  ))}
                </Box>
              );
            }
          })}
        </Box>
      );
    }

    return (
      <Box sx={{ pl: 2, pt: 1, pb: 1 }}>
        {Object.keys(obj).map((key) => {
          const value = obj[key];
          const fullKey = index !== null ? `${parentKey}[${index}].${key}` : `${parentKey}.${key}`;
          
          // Logging pour tracer les clés
          console.log("Rendu de la clé:", fullKey, "Type:", Array.isArray(value) ? "Array" : typeof value);
          
          // Cas spécial : options de QCM
          if (key === 'options' && Array.isArray(value)) {
            return (
              <Box key={fullKey} sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
                  Options ({value.length} éléments)
                  <IconButton 
                    size="small" 
                    color="primary" 
                    onClick={(e) => {
                      e.stopPropagation();
                      const newOption = { 
                        id: String(Date.now()), 
                        texte: '',
                        isCorrect: false 
                      };
                      
                      let newFormData = {...formData};
                      const parentPath = index !== null ? `${parentKey}[${index}]` : '';
                      console.log("Ajout d'option - chemin parent:", parentPath);
                      
                      // Obtenir le parent de options
                      let parent = newFormData;
                      if (parentPath) {
                        const parts = parentPath.split('.');
                        for (const part of parts) {
                          if (part.includes('[')) {
                            const arrName = part.substring(0, part.indexOf('['));
                            const arrIdx = parseInt(part.substring(part.indexOf('[') + 1, part.indexOf(']')));
                            
                            if (!parent[arrName]) parent[arrName] = [];
                            if (!parent[arrName][arrIdx]) parent[arrName][arrIdx] = {};
                            parent = parent[arrName][arrIdx];
                          } else {
                            if (!parent[part]) parent[part] = {};
                            parent = parent[part];
                          }
                        }
                      }
                      
                      // S'assurer que options existe
                      if (!parent.options) parent.options = [];
                      parent.options.push(newOption);
                      
                      console.log("Nouvelle option ajoutée:", newFormData);
                      setFormData(newFormData);
                      
                      if (onChange) {
                        onChange(newFormData);
                      }
                    }}
                    sx={{ ml: 1 }}
                  >
                    <AddIcon fontSize="small" />
                  </IconButton>
                </Typography>
                
                {value.map((item, idx) => {
                  // Vérifier que l'élément est valide avant de le rendre
                  if (!item || typeof item !== 'object') {
                    console.error(`Option invalide à l'index ${idx}:`, item);
                    return null;
                  }
                  return renderSimpleOption(item, idx, index !== null ? `${parentKey}[${index}]` : '');
                })}
              </Box>
            );
          }
          
          // Cas spécial : rendu d'un tableau d'objets
          else if (Array.isArray(value)) {
            return (
              <Box key={fullKey} sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
                  {key} ({value.length} éléments)
                  <IconButton 
                    size="small" 
                    color="primary" 
                    onClick={(e) => {
                      e.stopPropagation();
                      // Utiliser le chemin complet pour l'ajout d'éléments imbriqués
                      const nestedKey = index !== null ? `${parentKey}[${index}].${key}` : key;
                      handleAddItem(nestedKey);
                    }}
                    sx={{ ml: 1 }}
                  >
                    <AddIcon fontSize="small" />
                  </IconButton>
                </Typography>
                
                {value.map((item, idx) => (
                  <Accordion key={`${fullKey}[${idx}]`} sx={{ mb: 1 }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography>
                        Élément {idx + 1}
                        {typeof item === 'object' && item !== null && (item.texte || item.text) ? ` - ${(item.texte || item.text).substring(0, 30)}...` : ''}
                      </Typography>
                      <IconButton 
                        size="small" 
                        color="error" 
                        onClick={(e) => {
                          e.stopPropagation();
                          // Utiliser le chemin complet pour la suppression d'éléments imbriqués
                          const nestedKey = index !== null ? `${parentKey}[${index}].${key}` : key;
                          handleRemoveItem(nestedKey, idx);
                        }}
                        sx={{ ml: 'auto' }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </AccordionSummary>
                    <AccordionDetails>
                      {typeof item === 'object' && item !== null
                        ? renderNestedObject(item, `${parentKey}[${index}].${key}`, idx)
                        : (
                          <TextField
                            label={`${key}[${idx}]`}
                            value={item || ''}
                            onChange={(e) => handleNestedChange(`${parentKey}[${index}].${key}`, null, e.target.value, idx)}
                            fullWidth
                            multiline={typeof item === 'string' && item.length > 100}
                            sx={{ mb: 1 }}
                          />
                        )
                      }
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Box>
            );
          }
          
          // Cas d'un objet
          if (typeof value === 'object' && value !== null) {
            return (
              <Accordion key={fullKey} sx={{ mb: 1 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>{key}</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  {renderNestedObject(value, key)}
                </AccordionDetails>
              </Accordion>
            );
          }
          
          // Cas d'un champ simple
          return (
            <TextField
              key={fullKey}
              label={key}
              value={value !== null && value !== undefined ? value : ''}
              onChange={(e) => {
                if (index !== null) {
                  handleNestedChange(parentKey, key, e.target.value, index);
                } else {
                  handleNestedChange(parentKey, key, e.target.value);
                }
              }}
              fullWidth
              multiline={typeof value === 'string' && value.length > 100}
              sx={{ mb: 2 }}
            />
          );
        })}
      </Box>
    );
  };

  // Rendu principal
  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Modifier les propriétés de la ressource
      </Typography>
      <Divider sx={{ mb: 2 }} />
      
      {Object.keys(formData).map((key) => {
        const value = formData[key];
        
        // Cas d'un tableau
        if (Array.isArray(value)) {
          return (
            <Box key={key} sx={{ mb: 3 }}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', mb: 1 }}>
                  {key} ({value.length} éléments)
                  <IconButton 
                    size="small" 
                    color="primary" 
                    onClick={() => handleAddItem(key)}
                    sx={{ ml: 1 }}
                  >
                    <AddIcon fontSize="small" />
                  </IconButton>
                </Typography>
                
                {value.map((item, idx) => (
                  <Accordion key={`${key}[${idx}]`} sx={{ mb: 1 }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography>
                        Élément {idx + 1}
                        {typeof item === 'object' && item !== null && 'text' in item ? ` - ${item.text.substring(0, 30)}...` : ''}
                      </Typography>
                      <IconButton 
                        size="small" 
                        color="error" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveItem(key, idx);
                        }}
                        sx={{ ml: 'auto' }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </AccordionSummary>
                    <AccordionDetails>
                      {typeof item === 'object' && item !== null
                        ? renderNestedObject(item, key, idx)
                        : (
                          <TextField
                            label={`${key}[${idx}]`}
                            value={item || ''}
                            onChange={(e) => handleNestedChange(key, null, e.target.value, idx)}
                            fullWidth
                            multiline={typeof item === 'string' && item.length > 100}
                            sx={{ mb: 1 }}
                          />
                        )
                      }
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Paper>
            </Box>
          );
        }
        
        // Cas d'un objet
        if (typeof value === 'object' && value !== null) {
          return (
            <Box key={key} sx={{ mb: 3 }}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                  {key}
                </Typography>
                {renderNestedObject(value, key)}
              </Paper>
            </Box>
          );
        }
        
        // Cas d'un champ simple
        return (
          <TextField
            key={key}
            label={key}
            value={value !== null && value !== undefined ? value : ''}
            onChange={handleChange(key)}
            fullWidth
            multiline={typeof value === 'string' && value.length > 100}
            sx={{ mb: 2 }}
          />
        );
      })}
      
      {!hideButtons && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
          <Button onClick={onCancel} sx={{ mr: 1 }}>
            Annuler
          </Button>
          <Button variant="contained" onClick={() => onSubmit(formData)}>
            Valider
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default ResourceEditorForm;
