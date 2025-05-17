/**
 * Configuration centralisée pour la pagination dans toute l'application
 * Ce fichier permet de modifier facilement les paramètres de pagination
 * pour chaque type d'objet sans avoir à éditer de multiples fichiers
 */

const paginationConfig = {
  // Nombre d'éléments par page par défaut (utilisé si aucune valeur spécifique n'est définie)
  defaultItemsPerPage: 10,
  
  // Configuration spécifique par type d'objet
  resources: {
    itemsPerPage: 20,
    pageSizeOptions: [5, 10, 25, 50]
  },
  
  studyObjects: {
    itemsPerPage: 20,
    pageSizeOptions: [5, 10, 25, 50]
  },
  
  objectives: {
    itemsPerPage: 20,
    pageSizeOptions: [5, 10, 25, 50]
  },
  
  progressions: {
    itemsPerPage: 20,
    pageSizeOptions: [5, 10, 25, 50]
  },
  
  // Possibilité d'ajouter d'autres types d'objets au besoin
};

export default paginationConfig;
