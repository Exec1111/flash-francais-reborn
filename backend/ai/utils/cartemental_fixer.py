"""
Utilitaire pour réparer les documents HTML de carte mentale générés sans JavaScript.
"""

import re
import logging

logger = logging.getLogger(__name__)

# JavaScript complet à insérer
CARTEMENTAL_JAVASCRIPT = """
    <script>
        // Gestion du plier/déplier des branches principales
        function toggleBranch(branchIndex) {
            const branchElement = document.querySelector(`[data-branch="${branchIndex}"]`);
            if (branchElement) {
                branchElement.classList.toggle('expanded');
            }
        }

        // Gestion du plier/déplier des sous-branches
        function toggleSubBranch(branchIndex, subBranchIndex) {
            const subBranchElement = document.querySelector(
                `[data-branch="${branchIndex}"] [data-sub="${subBranchIndex}"]`
            );
            if (subBranchElement) {
                subBranchElement.classList.toggle('expanded');
            }
        }

        // Développer toutes les branches et sous-branches
        function expandAll() {
            document.querySelectorAll('.branch-item').forEach(branch => {
                branch.classList.add('expanded');
            });
            document.querySelectorAll('.sub-branch-item').forEach(subBranch => {
                subBranch.classList.add('expanded');
            });
        }

        // Réduire toutes les branches et sous-branches
        function collapseAll() {
            document.querySelectorAll('.branch-item.expanded').forEach(branch => {
                branch.classList.remove('expanded');
            });
            document.querySelectorAll('.sub-branch-item.expanded').forEach(subBranch => {
                subBranch.classList.remove('expanded');
            });
        }

        // Remettre la vue initiale (tout réduit)
        function resetView() {
            collapseAll();
        }

        // Initialisation au chargement de la page
        // Ajouter des event listeners sur les headers pour une meilleure compatibilité
        document.addEventListener('DOMContentLoaded', function() {
            // Event listeners pour les branches principales
            document.querySelectorAll('.branch-header').forEach((header, index) => {
                if (!header.hasAttribute('onclick')) {
                    header.addEventListener('click', function() {
                        const branchItem = this.closest('.branch-item');
                        if (branchItem) {
                            branchItem.classList.toggle('expanded');
                        }
                    });
                }
            });

            // Event listeners pour les sous-branches
            document.querySelectorAll('.sub-branch-header').forEach(header => {
                if (!header.hasAttribute('onclick')) {
                    header.addEventListener('click', function(e) {
                        e.stopPropagation();
                        const subBranchItem = this.closest('.sub-branch-item');
                        if (subBranchItem) {
                            subBranchItem.classList.toggle('expanded');
                        }
                    });
                }
            });

            // Event listener pour le bouton d'impression
            const printBtn = document.querySelector('.print-button');
            if (printBtn && !printBtn.hasAttribute('onclick')) {
                printBtn.addEventListener('click', function() {
                    window.print();
                });
            }

            // Event listeners pour les boutons de contrôle
            const buttons = document.querySelectorAll('.controls .btn');
            buttons.forEach(btn => {
                if (!btn.hasAttribute('onclick')) {
                    const text = btn.textContent.toLowerCase();
                    if (text.includes('développer')) {
                        btn.addEventListener('click', expandAll);
                    } else if (text.includes('réduire')) {
                        btn.addEventListener('click', collapseAll);
                    } else if (text.includes('initiale') || text.includes('vue')) {
                        btn.addEventListener('click', resetView);
                    }
                }
            });
        });
    </script>"""


def is_cartemental_html(html_content: str) -> bool:
    """
    Détecte si un document HTML est une carte mentale.
    
    Args:
        html_content: Contenu HTML à analyser
        
    Returns:
        True si c'est une carte mentale, False sinon
    """
    indicators = [
        'carte-container',
        'branch-item',
        'sub-branch-item',
        'mind-map-container',
        'Carte Mentale'
    ]
    
    return any(indicator in html_content for indicator in indicators)


def has_cartemental_javascript(html_content: str) -> bool:
    """
    Vérifie si le document HTML contient déjà le JavaScript de carte mentale.
    
    Args:
        html_content: Contenu HTML à analyser
        
    Returns:
        True si le JavaScript est présent, False sinon
    """
    js_indicators = [
        'function toggleBranch',
        'function expandAll',
        'function collapseAll'
    ]
    
    return any(indicator in html_content for indicator in js_indicators)


def add_cartemental_javascript(html_content: str) -> str:
    """
    Ajoute le JavaScript manquant à un document HTML de carte mentale.
    
    Args:
        html_content: Contenu HTML à corriger
        
    Returns:
        HTML corrigé avec le JavaScript ajouté
    """
    # Vérifier si c'est bien une carte mentale
    if not is_cartemental_html(html_content):
        logger.warning("Le document ne semble pas être une carte mentale")
        return html_content
    
    # Vérifier si le JavaScript est déjà présent
    if has_cartemental_javascript(html_content):
        logger.info("Le JavaScript est déjà présent dans la carte mentale")
        return html_content
    
    # Chercher la balise </body> pour insérer le JavaScript juste avant
    body_close_pattern = re.compile(r'</body>', re.IGNORECASE)
    match = body_close_pattern.search(html_content)
    
    if not match:
        logger.error("Impossible de trouver la balise </body> dans le document")
        return html_content
    
    # Insérer le JavaScript avant </body>
    insertion_point = match.start()
    corrected_html = (
        html_content[:insertion_point] + 
        CARTEMENTAL_JAVASCRIPT + 
        '\n' +
        html_content[insertion_point:]
    )
    
    logger.info("JavaScript de carte mentale ajouté avec succès")
    return corrected_html


def fix_cartemental_html(html_content: str) -> tuple[str, bool]:
    """
    Répare un document HTML de carte mentale en ajoutant le JavaScript si nécessaire.
    
    Args:
        html_content: Contenu HTML à réparer
        
    Returns:
        Tuple (html_corrigé, a_été_modifié)
    """
    if not is_cartemental_html(html_content):
        return html_content, False
    
    if has_cartemental_javascript(html_content):
        return html_content, False
    
    corrected_html = add_cartemental_javascript(html_content)
    return corrected_html, corrected_html != html_content
