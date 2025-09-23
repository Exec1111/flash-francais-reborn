import { useState, useEffect } from 'react';
import { initializeArrays } from '../utils/formUtils';

/**
 * Custom hook for managing form state with initialization logic
 * @param {object} initialData - The initial data for the form
 * @param {function} onChange - Callback function when form data changes
 * @returns {object} Form state and handlers
 */
export const useFormState = (initialData, onChange) => {
  // Ensure initialData is an object
  const safeInitialData = initialData && typeof initialData === 'object' ? initialData : {};
  const [formData, setFormData] = useState(safeInitialData);

  // Update formData when initialData changes (navigation between documents)
  useEffect(() => {
    console.log("useFormState - initialData mis à jour:", initialData);
    const safeData = initialData && typeof initialData === 'object' ? initialData : {};
    setFormData(safeData);
  }, [initialData]);

  // Initialize arrays in the form structure
  useEffect(() => {
    const initializedData = initializeArrays(formData);

    // Only update if changes were made
    if (JSON.stringify(initializedData) !== JSON.stringify(formData)) {
      console.log("Structure de données mise à jour avec tableaux initialisés");
      setFormData(initializedData);

      // Propagate changes if necessary
      if (onChange) {
        onChange(initializedData);
      }
    }
  }, []); // Only run on component mount

  // Handler for simple field changes
  const handleChange = (key) => (e) => {
    const newFormData = {
      ...formData,
      [key]: e.target.value,
    };
    setFormData(newFormData);

    // Notify parent of changes
    if (onChange) {
      onChange(newFormData);
    }
  };

  // Handler for nested field changes
  const handleNestedChange = (key, nestedKey, value, index = null) => {
    let newFormData = { ...formData };

    // Special handling for 'options' initialization
    if ((key === 'options' || key.endsWith('.options') || key.includes('.options[')) &&
        (newFormData[key] === undefined || !Array.isArray(newFormData[key]))) {
      console.log(`Initialisation forcée de 'options' pour la clé '${key}'`);

      if (key === 'options') {
        newFormData.options = [];
      } else if (key.includes('.')) {
        // For nested options, create the full structure
        const parts = key.split('.');
        let current = newFormData;

        // Navigate to options
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

        // Initialize the options array
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

    // Handle complex keys (with dots or array notation)
    if (key.includes('.') || key.includes('[')) {
      const parts = key.split('.');
      let current = newFormData;

      // Navigate through all parts except the last one
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (part.includes('[')) {
          const arrName = part.substring(0, part.indexOf('['));
          const arrIndex = parseInt(part.substring(part.indexOf('[') + 1, part.indexOf(']')));

          // Initialize array if needed
          if (!current[arrName] || !Array.isArray(current[arrName])) {
            console.log(`Initialisation de tableau pour '${arrName}' à l'indice ${i} du chemin`);
            current[arrName] = [];
          }

          // Initialize array element if needed
          if (!current[arrName][arrIndex]) {
            console.log(`Initialisation d'élément de tableau pour '${arrName}[${arrIndex}]'`);
            current[arrName][arrIndex] = {};
          }

          current = current[arrName][arrIndex];
        } else {
          // Handle regular objects
          if (!current[part] || typeof current[part] !== 'object' || Array.isArray(current[part])) {
            console.log(`Initialisation d'objet pour '${part}' à l'indice ${i} du chemin`);
            current[part] = {};
          }
          current = current[part];
        }
      }

      // Handle the last part of the path
      const lastPart = parts[parts.length - 1];

      if (lastPart.includes('[')) {
        const arrName = lastPart.substring(0, lastPart.indexOf('['));
        const arrIndex = parseInt(lastPart.substring(lastPart.indexOf('[') + 1, lastPart.indexOf(']')));

        // Initialize array if needed
        if (!current[arrName] || !Array.isArray(current[arrName])) {
          console.log(`Initialisation de tableau pour '${arrName}' à la fin du chemin`);
          current[arrName] = [];
        }

        // Modify value in array
        if (nestedKey) {
          // Ensure the element exists and is an object
          if (!current[arrName][arrIndex] || typeof current[arrName][arrIndex] !== 'object') {
            console.log(`Initialisation d'objet pour '${arrName}[${arrIndex}]'`);
            current[arrName][arrIndex] = {};
          }
          current[arrName][arrIndex][nestedKey] = value;
        } else {
          current[arrName][arrIndex] = value;
        }
      } else {
        // Modify simple object value
        if (nestedKey) {
          // Ensure the object exists
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
      // Handle simple keys
      if (index !== null) {
        // Array element
        if (!Array.isArray(newFormData[key])) {
          console.error(`La clé '${key}' n'est pas un tableau:`, newFormData[key]);
          newFormData[key] = [];
          return;
        }

        const newArray = [...newFormData[key]];

        if (nestedKey) {
          // Ensure index exists and is an object
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
        // Field in an object
        if (!newFormData[key] || typeof newFormData[key] !== 'object' || Array.isArray(newFormData[key])) {
          console.error(`La clé '${key}' n'est pas un objet:`, newFormData[key]);
          newFormData[key] = {};
        }

        newFormData[key] = {
          ...newFormData[key],
          [nestedKey]: value
        };
      }
    }

    console.log('Modification:', { key, nestedKey, value, index, formData: newFormData });

    setFormData(newFormData);

    if (onChange) {
      onChange(newFormData);
    }
  };

  return {
    formData,
    setFormData,
    handleChange,
    handleNestedChange
  };
};