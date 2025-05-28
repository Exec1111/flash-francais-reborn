/**
 * Utilitaires pour la manipulation du contenu HTML
 */

/**
 * Nettoie le HTML pour la prévisualisation
 * 
 * @param {string} html - HTML à nettoyer
 * @returns {string} HTML nettoyé
 */
export const sanitizeHtml = (html) => {
  if (!html) {
    return '';
  }
  
  // Cette fonction peut être améliorée avec une bibliothèque comme DOMPurify
  // pour une sanitisation plus robuste si nécessaire
  
  // Exemple simple de nettoyage basique
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Supprimer les scripts
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '') // Supprimer les iframes
    .replace(/on\w+="[^"]*"/gi, ''); // Supprimer les gestionnaires d'événements inline
};

/**
 * Vérifie si une chaîne est du HTML valide
 * 
 * @param {string} text - Texte à vérifier
 * @returns {boolean} Vrai si c'est du HTML valide
 */
export const isHtmlContent = (text) => {
  if (!text || typeof text !== 'string') {
    return false;
  }
  
  // Recherche des balises HTML courantes
  return /<[a-z][\s\S]*>/i.test(text);
};

/**
 * Convertit un objet JSON en HTML
 * 
 * @param {Object} jsonData - Données JSON à convertir
 * @returns {string} Représentation HTML
 */
export const jsonToHtml = (jsonData) => {
  if (!jsonData) {
    return '<p>Aucune donnée</p>';
  }
  
  // Si les données contiennent déjà du HTML
  if (jsonData.contenu_html || jsonData.html_content) {
    return jsonData.contenu_html || jsonData.html_content;
  }
  
  // Si c'est une chaîne qui semble être du HTML
  if (typeof jsonData === 'string' && isHtmlContent(jsonData)) {
    return jsonData;
  }
  
  // Construction d'un HTML simple à partir des données JSON
  let html = '';
  
  try {
    const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
    
    // Si c'est un objet, construire une représentation HTML
    if (typeof data === 'object' && data !== null) {
      html = '<div class="json-preview">';
      
      // Ajouter un titre si disponible
      if (data.titre || data.title) {
        html += `<h1>${data.titre || data.title}</h1>`;
      }
      
      // Ajouter une description si disponible
      if (data.description) {
        html += `<p class="description">${data.description}</p>`;
      }
      
      // Traiter le contenu principal
      if (data.contenu || data.content) {
        const content = data.contenu || data.content;
        
        if (typeof content === 'string') {
          if (isHtmlContent(content)) {
            html += content;
          } else {
            html += `<div class="content">${content}</div>`;
          }
        } else if (Array.isArray(content)) {
          html += '<ul>';
          content.forEach(item => {
            html += `<li>${typeof item === 'object' ? JSON.stringify(item) : item}</li>`;
          });
          html += '</ul>';
        }
      }
      
      // Traiter les sections si disponibles
      if (data.sections && Array.isArray(data.sections)) {
        data.sections.forEach(section => {
          html += '<section class="content-section">';
          
          if (section.titre || section.title) {
            html += `<h2>${section.titre || section.title}</h2>`;
          }
          
          if (section.contenu || section.content) {
            const sectionContent = section.contenu || section.content;
            if (isHtmlContent(sectionContent)) {
              html += sectionContent;
            } else {
              html += `<div class="section-content">${sectionContent}</div>`;
            }
          }
          
          html += '</section>';
        });
      }
      
      html += '</div>';
    } else {
      // Si c'est une valeur simple
      html = `<p>${data}</p>`;
    }
  } catch (error) {
    console.error('Erreur lors de la conversion JSON en HTML:', error);
    html = `<p>Erreur de conversion: ${error.message}</p>`;
  }
  
  return html;
};

/**
 * Extrait le texte brut d'un contenu HTML
 * 
 * @param {string} html - Contenu HTML
 * @returns {string} Texte brut extrait
 */
export const extractTextFromHtml = (html) => {
  if (!html || typeof html !== 'string') {
    return '';
  }
  
  // Créer un élément temporaire pour analyser le HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  
  // Récupérer le texte
  return tempDiv.textContent || tempDiv.innerText || '';
};
