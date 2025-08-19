import json
import os
from pathlib import Path
from pprint import pformat

import pytest
import requests
from jsonschema import Draft7Validator

from ...utils import BASE_URL, HEADERS, print_status


def _trace_auth_state(ctx: str) -> None:
    """Trace légère pour diagnostiquer les skips liés à l'auth."""
    if str(os.getenv("TEST_TRACE", "")).strip().lower() not in {"1", "true", "yes", "on"}:
        return
    tok = HEADERS.get("Authorization")
    masked = (tok[:12] + "..." + tok[-6:]) if isinstance(tok, str) and len(tok) > 24 else ("***masked***" if tok else None)
    print(f"[TRACE][{ctx}] BASE_URL={BASE_URL}")
    print(f"[TRACE][{ctx}] Authorization present={'Authorization' in HEADERS}, token={masked}")


def _trace_response(ctx: str, resp) -> None:
    """Si TEST_TRACE est activé, affiche le status et le corps JSON (ou texte) de la réponse."""
    if str(os.getenv("TEST_TRACE", "")).strip().lower() not in {"1", "true", "yes", "on"}:
        return
    print(f"[TRACE][{ctx}] status={resp.status_code}")
    try:
        data = resp.json()
        print(f"[TRACE][{ctx}] body=\n{pformat(data)}")
    except Exception:
        text = (resp.text or "")
        print(f"[TRACE][{ctx}] body_text=\n{text[:2000]}")


def _load_schema() -> dict:
    """Charge le schéma JSON d'analyse de texte depuis le repo.

    Le chemin visé est: backend/ai/prompts/config/schemas/analyse_texte.schema.json
    Ce fichier de test est dans: backend/tests/api_tests/ai/
    On remonte jusqu'au dossier 'backend' puis on rejoint le chemin du schéma.
    """
    backend_dir = Path(__file__).resolve().parents[3]  # .../backend
    schema_path = backend_dir / "ai" / "prompts" / "config" / "schemas" / "analyse_texte.schema.json"
    with schema_path.open("r", encoding="utf-8") as f:
        return json.load(f)


@pytest.mark.timeout(60)
def test_ai_generate_resource_analyse_texte_success():
    _trace_auth_state("analyse_texte_success")
    if "Authorization" not in HEADERS:
        pytest.skip("Skipping analyse_texte: token d'auth manquant (TEST_AUTH_TOKEN).")

    payload = {
        "type_key": "exercice",
        "subtype_key": "analyse_texte",
        "variables": {
            "texte_source": (
                "Dans le village, les enfants jouaient encore lorsque le soleil disparaissait derrière la colline. "
                "Le vent tiède apportait des parfums d'été, et les rires résonnaient sur la place pavée."
            ),
            "niveau": "5ème",
            "nombre_questions": 6,
            "instructions_personnalisees": "Réponses courtes, adaptées à un niveau 5ème."
        }
    }

    resp = requests.post(f"{BASE_URL}/ai/generate-resource", headers=HEADERS, json=payload)
    _trace_response("analyse_texte_success", resp)
    ok, detail = print_status(resp, "AI: génération analyse_texte")
    if not ok:
        pytest.fail(f"Échec génération analyse_texte: {detail}")

    body = resp.json()
    assert isinstance(body, dict), "La réponse doit être un objet JSON."
    assert "content" in body, "La réponse doit contenir la clé 'content'."
    content = body["content"]
    assert isinstance(content, dict), "'content' doit être un objet JSON."

    # Validation stricte via JSON Schema
    schema = _load_schema()
    Draft7Validator.check_schema(schema)
    validator = Draft7Validator(schema)
    errors = sorted(validator.iter_errors(content), key=lambda e: list(e.path))
    if errors:
        formatted = "\n".join(
            f"- {'/'.join(map(str, e.path)) or '<root>'}: {e.message}" for e in errors
        )
        pytest.fail(f"Le contenu ne respecte pas le schéma analyse_texte:\n{formatted}")

    # Sanity checks minimales en plus du schéma
    assert isinstance(content.get("analysisTitle"), str) and content["analysisTitle"].strip(), "analysisTitle manquant ou vide"
    sections = content.get("sections")
    assert isinstance(sections, list) and len(sections) == 6, "'sections' doit contenir exactement 6 éléments"
    for i, sec in enumerate(sections, start=1):
        assert isinstance(sec, dict), f"section[{i}] doit être un objet"
        assert sec.get("id") == i, f"section[{i}].id attendu {i}"
        assert isinstance(sec.get("title"), str) and sec["title"].strip(), f"section[{i}].title manquant"
        assert isinstance(sec.get("qa_pairs"), list) and len(sec["qa_pairs"]) >= 1, f"section[{i}].qa_pairs doit contenir >= 1 paire"
        for pair in sec["qa_pairs"]:
            assert isinstance(pair.get("question"), str), f"section[{i}].qa_pairs.question doit être une chaîne"
            assert isinstance(pair.get("answer"), str), f"section[{i}].qa_pairs.answer doit être une chaîne"
