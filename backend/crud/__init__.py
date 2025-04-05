# Exposer les fonctions du module user
from crud.user import (
    get_user,
    get_user_by_email,
    get_users,
    create_user,
    authenticate_user,
    update_user,
    delete_user
)
# Exposer les fonctions du module progression
from crud.progression import (
    get_progression,
    get_progressions,
    create_progression,
    update_progression,
    delete_progression
)
# Exposer les fonctions du module sequence
from crud.sequence import (
    get_sequence,
    get_sequences,
    get_sequences_by_progression,
    create_sequence,
    update_sequence,
    delete_sequence
)
# Exposer les fonctions du module session
from crud.session import (
    get_session,
    get_sessions,
    get_sessions_by_sequence,
    create_session,
    update_session,
    delete_session
)
# Exposer les fonctions du module resource
from crud.resource import (
    get_resource,
    get_resources,
    get_resources_by_session,
    get_resources_standalone,
    create_resource,
    update_resource,
    delete_resource
)

# Imports for Objective
from .objective import (
    get_objective,
    get_objective_by_title,
    get_objectives,
    create_objective,
    update_objective,
    delete_objective,
    add_objective_to_sequence,
    remove_objective_from_sequence,
    add_objective_to_session,
    remove_objective_from_session,
    get_objectives_by_sequence,
    get_objectives_by_session,
    get_sequences_by_objective,
    get_sessions_by_objective,
)

__all__ = [
    # Progression exports
    "get_progression",
    "get_progressions",
    "create_progression",
    "update_progression",
    "delete_progression",
    # Sequence exports
    "get_sequence",
    "get_sequences",
    "get_sequences_by_progression",
    "create_sequence",
    "update_sequence",
    "delete_sequence",
    # Session exports
    "get_session",
    "get_sessions",
    "get_sessions_by_sequence",
    "create_session",
    "update_session",
    "delete_session",
    # Resource exports
    "get_resource",
    "get_resources",
    "get_resources_by_session",
    "get_standalone_resources",
    "create_resource",
    "update_resource",
    "delete_resource",
    # Objective exports
    "get_objective",
    "get_objective_by_title",
    "get_objectives",
    "create_objective",
    "update_objective",
    "delete_objective",
    "add_objective_to_sequence",
    "remove_objective_from_sequence",
    "add_objective_to_session",
    "remove_objective_from_session",
    "get_objectives_by_sequence",
    "get_objectives_by_session",
    "get_sequences_by_objective",
    "get_sessions_by_objective",
]
