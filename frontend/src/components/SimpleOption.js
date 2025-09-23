import React from 'react';
import SimpleOptionRenderer from './SimpleOptionRenderer';

/**
 * Wrapper component for SimpleOptionRenderer with proper event handlers
 */
const SimpleOption = ({
  option,
  optionIdx,
  parentPath = '',
  formData,
  onOptionsChange,
  onRemoveOption
}) => {

  // Handle option text change
  const handleOptionTextChange = (e) => {
    const newFormData = {...formData};

    if (!parentPath) {
      // Options directly in root
      if (!newFormData.options) newFormData.options = [];
      if (!newFormData.options[optionIdx]) newFormData.options[optionIdx] = {};

      // Determine which field to use
      if ('texte' in option) {
        newFormData.options[optionIdx].texte = e.target.value;
      } else {
        newFormData.options[optionIdx].text = e.target.value;
      }
    } else {
      // Options in nested object
      try {
        let obj = newFormData;
        const path = parentPath.split('.');

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

        if (!obj.options) obj.options = [];
        if (!obj.options[optionIdx]) obj.options[optionIdx] = {};

        if ('texte' in option) {
          obj.options[optionIdx].texte = e.target.value;
        } else {
          obj.options[optionIdx].text = e.target.value;
        }
      } catch (error) {
        console.error("Erreur lors de la modification de l'option:", error);
      }
    }

    onOptionsChange(newFormData);
  };

  // Handle option isCorrect change
  const handleOptionIsCorrectChange = (e) => {
    const newFormData = {...formData};

    if (!parentPath) {
      if (!newFormData.options) newFormData.options = [];
      if (!newFormData.options[optionIdx]) newFormData.options[optionIdx] = {};
      newFormData.options[optionIdx].isCorrect = e.target.checked;
    } else {
      try {
        let obj = newFormData;
        const path = parentPath.split('.');

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

        if (!obj.options) obj.options = [];
        if (!obj.options[optionIdx]) obj.options[optionIdx] = {};
        obj.options[optionIdx].isCorrect = e.target.checked;
      } catch (error) {
        console.error("Erreur lors de la modification de l'option:", error);
      }
    }

    onOptionsChange(newFormData);
  };

  // Handle remove option
  const handleRemoveOption = () => {
    const newFormData = {...formData};

    if (!parentPath) {
      if (!newFormData.options || !Array.isArray(newFormData.options)) return;
      newFormData.options = newFormData.options.filter((_, idx) => idx !== optionIdx);
    } else {
      try {
        let obj = newFormData;
        const path = parentPath.split('.');

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

        if (!obj.options || !Array.isArray(obj.options)) return;
        obj.options = obj.options.filter((_, idx) => idx !== optionIdx);
      } catch (error) {
        console.error("Erreur lors de la suppression de l'option:", error);
      }
    }

    onRemoveOption(newFormData);
  };

  return (
    <SimpleOptionRenderer
      option={option}
      optionIdx={optionIdx}
      parentPath={parentPath}
      onOptionTextChange={handleOptionTextChange}
      onOptionIsCorrectChange={handleOptionIsCorrectChange}
      onRemoveOption={handleRemoveOption}
    />
  );
};

export default SimpleOption;