import React, { createContext, useContext } from 'react';

// Création du contexte
const TreeDataContext = createContext();

// Hook personnalisé pour utiliser le contexte plus facilement
export const useTreeData = () => useContext(TreeDataContext);

// Export du contexte lui-même si besoin (pour le Provider)
export default TreeDataContext;
