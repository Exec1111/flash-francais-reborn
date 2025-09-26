from fastapi import APIRouter
from .resource_types_router import resource_types_router
from .resource_media_router import resource_media_router
from .resource_read_router import resource_read_router
from .resource_create_router import resource_create_router
from .resource_update_router import resource_update_router
from .resource_delete_router import resource_delete_router
from .resource_docling_router import resource_docling_router
from .resource_study_objects_router import resource_study_objects_router
from .resource_utils import resource_utils_router
import logging

logger = logging.getLogger(__name__)

# Routeur principal refactorisé v2 pour les ressources
resource_router = APIRouter()

# Inclure tous les sous-routeurs spécialisés
resource_router.include_router(
    resource_types_router,
    prefix="/resources",
    tags=["resource-types"]
)

resource_router.include_router(
    resource_media_router,
    prefix="/resources",
    tags=["resource-media"]
)

resource_router.include_router(
    resource_read_router,
    prefix="/resources",
    tags=["resource-read"]
)

resource_router.include_router(
    resource_create_router,
    prefix="/resources",
    tags=["resource-create"]
)

resource_router.include_router(
    resource_update_router,
    prefix="/resources",
    tags=["resource-update"]
)

resource_router.include_router(
    resource_delete_router,
    prefix="/resources",
    tags=["resource-delete"]
)

resource_router.include_router(
    resource_docling_router,
    prefix="/resources",
    tags=["resource-docling"]
)

resource_router.include_router(
    resource_study_objects_router,
    prefix="/resources",
    tags=["resource-study-objects"]
)

resource_router.include_router(
    resource_utils_router,
    prefix="/resources",
    tags=["resource-utils"]
)

logger.info(">>> Resource router refactorisé v2 avec tous les sous-routeurs spécialisés inclus <<<")