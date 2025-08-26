import React, { createContext, useContext } from 'react';

// Création du contexte pour gérer l'état du layout
const LayoutContext = createContext();

// Hook personnalisé pour utiliser le contexte du layout
export const useLayout = () => {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error('useLayout must be used within a LayoutProvider');
  }
  return context;
};

// Export du contexte lui-même pour le Provider
export default LayoutContext;