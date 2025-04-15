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
 * @returns {Object} - Nœud transformé
 */
export const transformNode = (node) => ({
  ...node,
  id: `${node.type}_${node.id}`, // Créer un ID unique avec préfixe
  isExpanded: false,
  // Ajouter un enfant 'loading' si le nœud peut avoir des enfants et n'en a pas déjà
  children: node.type !== 'resource' && (!node.children || node.children.length === 0) ?
    [{ id: `loading-${node.id}`, type: 'loading' }] :
    (node.children ? node.children.map(transformNode) : [])
});
