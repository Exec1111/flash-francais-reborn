import re
import logging
from typing import Optional

logger = logging.getLogger(__name__)

def clean_html(html_content: str) -> str:
    """
    Nettoie le contenu HTML en supprimant les espaces et retours à la ligne inutiles
    tout en préservant la structure et la lisibilité.
    
    Args:
        html_content: Le contenu HTML à nettoyer
        
    Returns:
        Le contenu HTML nettoyé
    """
    if not html_content or not isinstance(html_content, str):
        return html_content
    
    try:
        # 1. Supprimer les espaces en début et fin
        cleaned = html_content.strip()
        
        # 2. Supprimer les lignes vides multiples (gérer CRLF) -> compacter à UNE seule ligne vide
        #   - Convertit toute séquence de lignes vides en une seule ligne vide
        #   - Supporte \r\n (Windows) et \n (Unix)
        cleaned = re.sub(r'(?:\r?\n)\s*(?:\r?\n)+', '\n', cleaned)
        
        # 3. Supprimer les espaces en fin de ligne
        cleaned = re.sub(r'[ \t]+$', '', cleaned, flags=re.MULTILINE)
        
        # 4. Supprimer les espaces multiples entre les balises (mais pas à l'intérieur du contenu)
        # Attention : ne pas toucher aux espaces dans le contenu textuel
        cleaned = re.sub(r'>\s+<', '><', cleaned)
        
        # 5. Nettoyer les espaces autour des balises auto-fermantes
        cleaned = re.sub(r'\s+/>', '/>', cleaned)
        
        # 6. Supprimer les espaces multiples dans les attributs
        cleaned = re.sub(r'=\s+"', '="', cleaned)
        cleaned = re.sub(r'"\s+>', '">', cleaned)
        
        # 7. Normaliser l'indentation (remplacer les tabulations par des espaces)
        cleaned = cleaned.replace('\t', '  ')
        
        # 8. Supprimer les espaces multiples consécutifs (mais préserver les espaces simples dans le contenu)
        # Seulement entre les balises - utiliser une approche plus simple
        cleaned = re.sub(r'>\s{2,}<', '> <', cleaned)
        
        # 9. Nettoyer les commentaires HTML mal formatés
        cleaned = re.sub(r'<!--\s+', '<!-- ', cleaned)
        cleaned = re.sub(r'\s+-->', ' -->', cleaned)
        
        # 10. Normaliser les fins de ligne en \n et s'assurer d'un retour final
        cleaned = cleaned.replace('\r\n', '\n').replace('\r', '\n')
        if cleaned and not cleaned.endswith('\n'):
            cleaned += '\n'
            
        logger.debug(f"HTML nettoyé : {len(html_content)} -> {len(cleaned)} caractères")
        return cleaned
        
    except Exception as e:
        logger.error(f"Erreur lors du nettoyage HTML: {e}")
        # En cas d'erreur, retourner le contenu original
        return html_content


def remove_empty_blocks_and_breaks(html_content: str) -> str:
    """
    Supprime les blocs HTML vides courants et compacte les <br> multiples.
    - Enlève <p>&nbsp;</p>, <p><br></p>, <div><br></div>, variantes avec espaces
    - Compresse 3+ <br> consécutifs en un seul <br>
    - Conserve le contenu textuel non vide
    """
    if not html_content or not isinstance(html_content, str):
        return html_content
    try:
        cleaned = html_content
        # Normaliser les fins de ligne pour simplifier les regex
        cleaned = cleaned.replace('\r\n', '\n').replace('\r', '\n')

        # Supprimer blocs <p> vides (espaces, &nbsp;, <br>)
        cleaned = re.sub(r'<p>(?:\s|&nbsp;|<br\s*/?>)*</p>', '', cleaned, flags=re.IGNORECASE)
        # Supprimer blocs <div> vides
        cleaned = re.sub(r'<div>(?:\s|&nbsp;|<br\s*/?>)*</div>', '', cleaned, flags=re.IGNORECASE)
        # Supprimer autres blocs courants vides (h1-h6, section) si strictement vides
        cleaned = re.sub(r'<(h[1-6]|section)>(?:\s|&nbsp;|<br\s*/?>)*</\1>', '', cleaned, flags=re.IGNORECASE)

        # Compacter <br> multiples: 3 ou plus -> 1
        cleaned = re.sub(r'(?:<br\s*/?>\s*){3,}', '<br>', cleaned, flags=re.IGNORECASE)

        return cleaned
    except Exception as e:
        logger.error(f"Erreur lors de la suppression des blocs vides: {e}")
        return html_content

def clean_html_aggressive(html_content: str) -> str:
    """
    Version plus agressive du nettoyage HTML qui supprime tous les espaces
    et retours à la ligne inutiles pour minimiser la taille.
    
    Args:
        html_content: Le contenu HTML à nettoyer
        
    Returns:
        Le contenu HTML nettoyé de manière agressive
    """
    if not html_content or not isinstance(html_content, str):
        return html_content
    
    try:
        # Appliquer d'abord le nettoyage standard
        cleaned = clean_html(html_content)
        
        # Puis supprimer tous les retours à la ligne et espaces entre balises
        cleaned = re.sub(r'>\s+<', '><', cleaned)
        cleaned = re.sub(r'\n\s*', '', cleaned)
        
        # Garder seulement les espaces nécessaires dans le contenu textuel
        # (cette version est plus risquée car elle peut affecter la mise en page)
        
        return cleaned.strip()
        
    except Exception as e:
        logger.error(f"Erreur lors du nettoyage HTML aggressif: {e}")
        return html_content

def preserve_content_spaces(html_content: str) -> str:
    """
    Nettoie le HTML en préservant soigneusement les espaces dans le contenu textuel.
    Cette version est plus sûre pour le contenu éditorial.
    
    Args:
        html_content: Le contenu HTML à nettoyer
        
    Returns:
        Le contenu HTML nettoyé avec préservation du contenu
    """
    if not html_content or not isinstance(html_content, str):
        return html_content
    
    try:
        # 1. Supprimer les espaces en début et fin
        cleaned = html_content.strip()
        
        # 2. Supprimer seulement les lignes complètement vides
        cleaned = re.sub(r'\n\s*\n\s*\n+', '\n\n', cleaned)
        
        # 3. Supprimer les espaces en fin de ligne seulement
        cleaned = re.sub(r'[ \t]+$', '', cleaned, flags=re.MULTILINE)
        
        # 4. Nettoyer seulement les espaces entre balises fermantes et ouvrantes
        # Utiliser une approche plus simple sans lookbehind variable
        cleaned = re.sub(r'</([^>]+)>\s+<([^/])', r'</\1><\2', cleaned)
        
        # 5. S'assurer qu'il y a un retour à la ligne final
        if cleaned and not cleaned.endswith('\n'):
            cleaned += '\n'
            
        return cleaned
        
    except Exception as e:
        logger.error(f"Erreur lors du nettoyage HTML préservant: {e}")
        return html_content
