/**
 * Fonctions utilitaires pour le composant SideNav et l'arbre de navigation
 */

/**
 * Met à jour l'état d'un nœud dans l'arbre récursivement
 * @param {Array} nodes - Tableau de nœuds à traiter
 * @param {string} nodeId - ID du nœud à mettre à jour
 * @param {Object} updates - Mises à jour à appliquer au nœud
 * @returns {Array} - Tableau mis à jour
 */
export const updateNodeStateRecursive = (nodes, nodeId, updates) => {
  return nodes.map(node => {
    if (node.id === nodeId) {
      return { ...node, ...updates };
    }
    if (node.children && node.children.length > 0) {
      return {
        ...node,
        children: updateNodeStateRecursive(node.children, nodeId, updates)
      };
    }
    return node;
  });
};

/**
 * Transforme un nœud pour ajouter les propriétés nécessaires à l'affichage dans l'arbre
 * @param {Object} node - Nœud à transformer
 * @param {number} index - Index du nœud dans la liste (utilisé pour le drag and drop)
 * @returns {Object} - Nœud transformé
 */
export const transformNode = (node, index) => ({
  ...node,
  id: `${node.type}_${node.id}`, // Créer un ID unique avec préfixe
  originalId: node.id, // Garder l'ID original pour les mises à jour
  order: node.order !== undefined ? node.order : index, // Utiliser l'ordre existant ou l'index par défaut
  index: index, // Stocker l'index pour le drag and drop
  isExpanded: false,
  // Ajouter un enfant 'loading' si le nœud peut avoir des enfants et n'en a pas déjà
  children: node.type !== 'resource' && (!node.children || node.children.length === 0) ?
    [{ id: `loading-${node.id}`, type: 'loading' }] :
    (node.children ? node.children.map((childNode, childIndex) => transformNode(childNode, childIndex)) : [])
});
