"""
Module pour les prompts IA générateurs de contenu.
Ce module contient les différents templates de prompts à utiliser avec différents LLM.
"""

from backend.ai.prompts.base import BasePrompt
from backend.ai.prompts.exercises.qcm import QCMPrompt

__all__ = ["BasePrompt", "QCMPrompt"]
