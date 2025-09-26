// Export des éditeurs structurés par type d'exercice
export { default as Champlex2Editor } from './Champlex2Editor';
export { default as ChamplexEditor } from './ChamplexEditor';
export { default as QcmEditor } from './QcmEditor';
export { default as PenduEditor } from './PenduEditor';
export { default as QuisuisjeEditor } from './QuisuisjeEditor';

// Fonction pour obtenir l'éditeur approprié selon le type d'exercice
export const getStructuredEditor = (subtypeKey) => {
  const editors = {
    'champlex': 'ChamplexEditor',
    'champlex2': 'Champlex2Editor',
    'qcm': 'QcmEditor',
    'pendu': 'PenduEditor',
    'quisuisje': 'QuisuisjeEditor',
  };

  return editors[subtypeKey?.toLowerCase()] || null;
};

// Vérifier si un type d'exercice a un éditeur structuré
export const hasStructuredEditor = (subtypeKey) => {
  return getStructuredEditor(subtypeKey) !== null;
};
