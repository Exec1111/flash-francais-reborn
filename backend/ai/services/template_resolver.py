"""
Service de résolution automatique des chemins de templates.
Permet de déduire le chemin runtime à partir du template de base.
"""
from pathlib import Path
from typing import Optional, Tuple
import logging

logger = logging.getLogger(__name__)

class TemplateResolver:
    """
    Résout automatiquement les chemins de templates base et runtime.
    Convention:
    - Template base: backend/ai/template/default_{type}_{subtype}.html
    - Template runtime: backend/ai/template_runtime/{subtype}_runtime_template.html
    """
    
    BASE_TEMPLATE_DIR = Path(__file__).resolve().parent.parent / 'template'
    RUNTIME_TEMPLATE_DIR = Path(__file__).resolve().parent.parent / 'template_runtime'
    
    @classmethod
    def get_base_template_path(cls, type_key: str, subtype_key: str) -> Optional[Path]:
        """
        Résout le chemin du template de base.
        Ex: ('exercice', 'qcm') -> backend/ai/template/default_exercice_qcm.html
        """
        template_name = f"default_{type_key}_{subtype_key}.html"
        template_path = cls.BASE_TEMPLATE_DIR / template_name
        
        if template_path.exists():
            logger.debug(f"Template de base trouvé: {template_path}")
            return template_path
        
        logger.warning(f"Template de base non trouvé: {template_path}")
        return None
    
    @classmethod
    def get_runtime_template_path(cls, type_key: str, subtype_key: str) -> Optional[Path]:
        """
        Résout le chemin du template runtime.
        Ex: ('exercice', 'qcm') -> backend/ai/template_runtime/qcm_runtime_template.html
        """
        template_name = f"{subtype_key}_runtime_template.html"
        template_path = cls.RUNTIME_TEMPLATE_DIR / template_name
        
        if template_path.exists():
            logger.debug(f"Template runtime trouvé: {template_path}")
            return template_path
        
        logger.warning(f"Template runtime non trouvé: {template_path}")
        return None
    
    @classmethod
    def get_template_key(cls, type_key: str, subtype_key: str, version: int = 1) -> str:
        """
        Génère une clé de template standardisée.
        Ex: ('exercice', 'qcm', 1) -> 'exercice_qcm_v1'
        """
        return f"{type_key}_{subtype_key}_v{version}"
    
    @classmethod
    def resolve_templates(cls, type_key: str, subtype_key: str) -> Tuple[Optional[Path], Optional[Path], str]:
        """
        Résout les deux templates et génère la clé.
        
        Returns:
            Tuple[base_path, runtime_path, template_key]
        """
        base_path = cls.get_base_template_path(type_key, subtype_key)
        runtime_path = cls.get_runtime_template_path(type_key, subtype_key)
        template_key = cls.get_template_key(type_key, subtype_key)
        
        logger.info(f"Résolution templates pour {type_key}/{subtype_key}: base={base_path}, runtime={runtime_path}, key={template_key}")
        
        return base_path, runtime_path, template_key
    
    @classmethod
    def ensure_runtime_template_exists(cls, type_key: str, subtype_key: str) -> bool:
        """
        Vérifie que le template runtime existe.
        Retourne True si le template existe, False sinon.
        """
        runtime_path = cls.get_runtime_template_path(type_key, subtype_key)
        exists = runtime_path is not None and runtime_path.exists()
        
        if not exists:
            logger.error(f"Template runtime manquant pour {type_key}/{subtype_key}. "
                        f"Créez: {cls.RUNTIME_TEMPLATE_DIR / f'{subtype_key}_runtime_template.html'}")
        
        return exists
