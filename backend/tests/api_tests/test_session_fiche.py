import requests
import json
from ..utils import BASE_URL, HEADERS, UNIQUE_SUFFIX, print_status


def _create_simple_resource_for_session(session_id: int) -> int:
    """Crée une ressource minimale associée à une session et retourne son ID."""
    form = {
        "title": f"Ressource Fiche Test - {UNIQUE_SUFFIX}",
        "description": "Ressource de test pour fiche",
        "type_id": 1,  # Hypothèse alignée avec les autres tests
        "sub_type_id": 1,
        "source_type": "ai",
        "session_ids_json": json.dumps([session_id] if session_id else []),
    }
    # Forcer multipart/form-data comme dans les autres tests via files
    resp = requests.post(f"{BASE_URL}/resources/", headers=HEADERS, data=form, files={"file": (None, "")})
    ok, detail = print_status(resp, "Créer Resource pour Session (Form Data)")
    if not ok:
        raise AssertionError(f"Echec création ressource: {detail}")
    return resp.json().get("id")


def test_fiche_not_modified_by_resource_association(session_id):
    """
    Vérifie que l'association de ressources à une séance (création M2M) ne modifie jamais fiche_resource_id.
    """
    if session_id is None:
        print("\n! Skipping fiche test: Session ID manquant.")
        return False, "Session ID manquant pour tester la fiche."

    # État initial de la séance
    r0 = requests.get(f"{BASE_URL}/sessions/{session_id}")
    ok0, detail0 = print_status(r0, f"Lire Session {session_id}")
    if not ok0:
        return False, f"Lecture Session échouée: {detail0}"
    initial_fiche_id = r0.json().get("fiche_resource_id")

    # Créer une ressource associée à la séance
    _ = _create_simple_resource_for_session(session_id)

    # Relire la séance: fiche_resource_id ne doit pas avoir changé
    r1 = requests.get(f"{BASE_URL}/sessions/{session_id}")
    ok1, detail1 = print_status(r1, f"Relire Session {session_id}")
    if not ok1:
        return False, f"Relire Session échouée: {detail1}"
    after_fiche_id = r1.json().get("fiche_resource_id")

    if after_fiche_id != initial_fiche_id:
        return False, (
            f"fiche_resource_id modifié par association de ressource: initial={initial_fiche_id}, "
            f"après association={after_fiche_id}"
        )

    return True, None


def test_set_update_ignore_and_remove_fiche(session_id):
    """
    Vérifie le workflow complet de la fiche:
    - POST /{session_id}/fiche/{resource_id} affecte bien la fiche
    - PUT /sessions/{id} ignore toute tentative de changer fiche_resource_id
    - DELETE /{session_id}/fiche supprime la fiche
    - Re-associer des ressources M2M n'altère pas fiche_resource_id
    """
    if session_id is None:
        print("\n! Skipping fiche workflow: Session ID manquant.")
        return False, "Session ID manquant pour le workflow de fiche."

    # 1) Créer une ressource R1 et l'attacher comme fiche
    r1_id = _create_simple_resource_for_session(session_id)

    attach = requests.post(f"{BASE_URL}/sessions/{session_id}/fiche/{r1_id}", headers=HEADERS)
    ok_attach, detail_attach = print_status(attach, f"Attacher Fiche R1={r1_id} à Session {session_id}")
    if not ok_attach:
        return False, f"Attach fiche échoué: {detail_attach}"

    body = attach.json()
    if body.get("fiche_resource_id") != r1_id:
        return False, f"Après attach, fiche_resource_id != {r1_id}: reçu {body.get('fiche_resource_id')}"

    # 2) Tenter de changer la fiche via update_session (doit être ignoré)
    # Créer une seconde ressource R2
    r2_id = _create_simple_resource_for_session(session_id)

    update_payload = {
        "notes": f"Tentative de MAJ fiche via update_session - {UNIQUE_SUFFIX}",
        "fiche_resource_id": r2_id,
    }
    upd = requests.put(f"{BASE_URL}/sessions/{session_id}", headers=HEADERS, json=update_payload)
    ok_upd, detail_upd = print_status(upd, f"Update Session {session_id} (tentative MAJ fiche -> {r2_id})")
    if not ok_upd:
        return False, f"Update session échouée: {detail_upd}"

    # Vérifier que la fiche n'a pas changé (reste R1)
    r_check = requests.get(f"{BASE_URL}/sessions/{session_id}")
    ok_check, detail_check = print_status(r_check, f"Vérifier fiche non modifiée {session_id}")
    if not ok_check:
        return False, f"Vérification séance échouée: {detail_check}"

    fiche_after_update = r_check.json().get("fiche_resource_id")
    if fiche_after_update != r1_id:
        return False, f"update_session a modifié fiche_resource_id: attendu {r1_id}, reçu {fiche_after_update}"

    # 3) Supprimer la fiche via DELETE
    detach = requests.delete(f"{BASE_URL}/sessions/{session_id}/fiche", headers=HEADERS)
    ok_detach, detail_detach = print_status(detach, f"Supprimer Fiche de Session {session_id}")
    if not ok_detach:
        return False, f"Detach fiche échoué: {detail_detach}"

    if detach.json().get("fiche_resource_id") is not None:
        return False, f"Après delete fiche, fiche_resource_id devrait être None, reçu {detach.json().get('fiche_resource_id')}"

    # 4) Re-associer une ressource M2M (création) ne doit pas définir la fiche
    _ = _create_simple_resource_for_session(session_id)
    r_final = requests.get(f"{BASE_URL}/sessions/{session_id}")
    ok_final, detail_final = print_status(r_final, f"Vérifier fiche inchangée après association M2M {session_id}")
    if not ok_final:
        return False, f"Vérification finale échouée: {detail_final}"

    if r_final.json().get("fiche_resource_id") is not None:
        return False, f"Association M2M a (ré)défini la fiche: reçu {r_final.json().get('fiche_resource_id')}"

    return True, None
