import { useCallback } from 'react';
import { setNestedValue, getNestedValue, createEmptyObjectFromTemplate } from '../utils/formUtils';

/**
 * Custom hook for array operations in forms
 * @param {object} formData - Current form data
 * @param {function} setFormData - Function to update form data
 * @param {function} onChange - Callback for form changes
 * @returns {object} Array operation handlers
 */
export const useArrayOperations = (formData, setFormData, onChange) => {

  // Add an item to an array
  const handleAddItem = useCallback((key) => {
    console.log("Ajout d'élément à la clé:", key);

    // Handle complex keys (with dots or array notation)
    if (key.includes('.') || key.includes('[')) {
      const parts = key.split('.');
      let current = {...formData};
      const path = [];

      // Navigate through all parts except the last one
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        path.push(part);

        if (part.includes('[')) {
          const arrName = part.substring(0, part.indexOf('['));
          const arrIdx = parseInt(part.substring(part.indexOf('[') + 1, part.indexOf(']')));
          path.pop();
          path.push(arrName);

          let tempCurrent = current;
          for (let j = 0; j < path.length - 1; j++) {
            if (!tempCurrent[path[j]]) tempCurrent[path[j]] = {};
            tempCurrent = tempCurrent[path[j]];
          }

          if (!tempCurrent[arrName]) tempCurrent[arrName] = [];
          if (!tempCurrent[arrName][arrIdx]) tempCurrent[arrName][arrIdx] = {};

          path.push(arrIdx);
        }

        let tempCurrent = current;
        for (let j = 0; j < path.length - 1; j++) {
          if (!tempCurrent[path[j]]) tempCurrent[path[j]] = {};
          tempCurrent = tempCurrent[path[j]];
        }

        const lastPathPart = path[path.length - 1];
        if (typeof lastPathPart === 'number') {
          const arrName = path[path.length - 2];
          if (!tempCurrent[arrName]) tempCurrent[arrName] = [];
          if (!tempCurrent[arrName][lastPathPart]) tempCurrent[arrName][lastPathPart] = {};
        } else {
          if (!tempCurrent[lastPathPart]) tempCurrent[lastPathPart] = {};
        }
      }

      const lastPart = parts[parts.length - 1];
      path.push(lastPart);

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

      if (lastPart.includes('[')) {
        const arrName = lastPart.substring(0, lastPart.indexOf('['));
        const arrIdx = parseInt(lastPart.substring(lastPart.indexOf('[') + 1, lastPart.indexOf(']')));

        if (!tempCurrent[arrName]) tempCurrent[arrName] = [];

        let newItem;
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
          const template = tempCurrent[arrName][0];
          newItem = createEmptyObjectFromTemplate(template);
        } else {
          newItem = {};
        }

        tempCurrent[arrName].push(newItem);
      } else {
        if (!tempCurrent[lastPart]) tempCurrent[lastPart] = [];

        let newItem;
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
          const template = tempCurrent[lastPart][0];
          newItem = createEmptyObjectFromTemplate(template);
        } else {
          newItem = {};
        }

        tempCurrent[lastPart].push(newItem);
      }

      setFormData(current);
      if (onChange) onChange(current);
      return;
    }

    // Handle simple keys
    const currentArray = Array.isArray(formData[key]) ? formData[key] : [];
    let newItem;

    if (currentArray.length > 0) {
      const template = currentArray[0];
      newItem = createEmptyObjectFromTemplate(template);
    } else {
      if (key === 'options' || key === 'choices') {
        newItem = {
          id: String(Date.now()),
          text: '',
          isCorrect: false
        };
      } else if (key === 'questions') {
        newItem = {
          id: String(Date.now()),
          question: '',
          options: []
        };
      } else {
        newItem = {};
      }
    }

    const newArray = [...currentArray, newItem];
    const newFormData = {
      ...formData,
      [key]: newArray
    };

    setFormData(newFormData);
    if (onChange) onChange(newFormData);
  }, [formData, setFormData, onChange]);

  // Remove an item from an array
  const handleRemoveItem = useCallback((key, index) => {
    console.log("Suppression d'élément à la clé:", key, "index:", index);

    // Handle complex keys
    if (key.includes('.') || key.includes('[')) {
      const parts = key.split('.');
      let current = {...formData};
      const path = [];

      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];

        if (part.includes('[')) {
          const arrName = part.substring(0, part.indexOf('['));
          const arrIdx = parseInt(part.substring(part.indexOf('[') + 1, part.indexOf(']')));

          if (!current[arrName]) return;
          if (!Array.isArray(current[arrName])) return;
          if (!current[arrName][arrIdx]) return;

          current = current[arrName][arrIdx];
        } else {
          if (!current[part] || typeof current[part] !== 'object') return;
          current = current[part];
        }
      }

      const lastPart = parts[parts.length - 1];

      if (lastPart.includes('[')) {
        const arrName = lastPart.substring(0, lastPart.indexOf('['));

        if (!current[arrName] || !Array.isArray(current[arrName])) return;

        const newArray = [...current[arrName]];
        newArray.splice(index, 1);
        current[arrName] = newArray;
      } else {
        if (!current[lastPart] || !Array.isArray(current[lastPart])) return;

        const newArray = [...current[lastPart]];
        newArray.splice(index, 1);
        current[lastPart] = newArray;
      }

      setFormData(current);
      if (onChange) onChange(current);
      return;
    }

    // Handle simple keys
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
    if (onChange) onChange(newFormData);
  }, [formData, setFormData, onChange]);

  return {
    handleAddItem,
    handleRemoveItem
  };
};