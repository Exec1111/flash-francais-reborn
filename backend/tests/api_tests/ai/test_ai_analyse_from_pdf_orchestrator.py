import os
import json
from pathlib import Path
from pprint import pformat

import pytest
import requests
from jsonschema import Draft7Validator

from ...utils import BASE_URL, HEADERS, print_status

# En-têtes sans Content-Type pour laisser requests gérer le multipart
AUTH_HEADERS = {k: v for k, v in HEADERS.items() if k.lower() != "content-type"}


def _mask_token(token: str | None) -> str | None:
    if not token:
        return None
    return (token[:12] + "..." + token[-6:]) if len(token) > 24 else "***masked***"


def _trace(ctx: str, resp=None):
    if str(os.getenv("TEST_TRACE", "")).strip().lower() not in {"1", "true", "yes", "on"}:
        return
    tok = HEADERS.get("Authorization")
    print(f"[TRACE][{ctx}] BASE_URL={BASE_URL}")
    print(f"[TRACE][{ctx}] Authorization present={'Authorization' in HEADERS}, token={_mask_token(tok) if isinstance(tok, str) else tok}")
    if resp is not None:
        print(f"[TRACE][{ctx}] status={resp.status_code}")
        try:
            data = resp.json()
            print(f"[TRACE][{ctx}] body=\n{pformat(data)}")
        except Exception:
            print(f"[TRACE][{ctx}] body_text=\n{(resp.text or '')[:2000]}")


def _load_schema() -> dict:
    backend_dir = Path(__file__).resolve().parents[3]  # .../backend
    schema_path = backend_dir / "ai" / "prompts" / "config" / "schemas" / "analyse_texte.schema.json"
    with schema_path.open("r", encoding="utf-8") as f:
        return json.load(f)


def _build_minimal_pdf_bytes() -> bytes:
    pdf_str = (
        "%PDF-1.4\n"
        "1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n"
        "2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n"
        "3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>endobj\n"
        "4 0 obj<< /Length 55 >>stream\nBT /F1 24 Tf 72 120 Td (Hello PDF) Tj ET\nendstream endobj\n"
        "5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\n"
        "xref\n0 6\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000114 00000 n \n0000000301 00000 n \n0000000411 00000 n \n"
        "trailer<< /Size 6 /Root 1 0 R >>\nstartxref\n520\n%%EOF\n"
    )
    return pdf_str.encode("latin-1")


@pytest.mark.timeout(90)
def test_analyse_texte_from_pdf_upload_success():
    if "Authorization" not in AUTH_HEADERS:
        pytest.skip("Skipping orchestrateur upload: token d'auth manquant (TEST_AUTH_TOKEN).")

    files = {"file": ("test.pdf", _build_minimal_pdf_bytes(), "application/pdf")}
    data = {
        "ocr": "false",
        "niveau": "5ème",
        "nombre_questions": "6",
        "instructions_personnalisees": "Réponses courtes, adaptées à un niveau 5ème.",
    }

    resp = requests.post(f"{BASE_URL}/ai/analyse-texte-from-pdf", headers=AUTH_HEADERS, data=data, files=files)
    _trace("orchestrateur_upload", resp)
    ok, detail = print_status(resp, "Orchestrateur: analyse_texte via upload PDF")
    if not ok:
        pytest.fail(f"Échec orchestrateur (upload): {detail}")

    payload = resp.json()
    assert "content" in payload and isinstance(payload["content"], dict)
    assert "extraction" in payload and isinstance(payload["extraction"], dict)
    assert isinstance(payload["extraction"].get("document_markdown", ""), str)

    # Validation stricte via JSON Schema
    schema = _load_schema()
    Draft7Validator.check_schema(schema)
    validator = Draft7Validator(schema)
    errors = sorted(validator.iter_errors(payload["content"]), key=lambda e: list(e.path))
    if errors:
        formatted = "\n".join(f"- {'/'.join(map(str, e.path)) or '<root>'}: {e.message}" for e in errors)
        pytest.fail(f"Le contenu ne respecte pas le schéma analyse_texte:\n{formatted}")


@pytest.mark.timeout(120)
def test_analyse_texte_from_pdf_via_resource_id_success(resource_id_holder):
    if "Authorization" not in AUTH_HEADERS:
        pytest.skip("Skipping orchestrateur resource_id: token d'auth manquant (TEST_AUTH_TOKEN).")

    # 1) Créer une ressource PDF
    data = {
        "title": "Ressource PDF Orchestrateur",
        "description": "PDF pour test orchestrateur",
        "type_id": 1,
        "sub_type_id": 1,
        "source_type": "file",
        "session_ids_json": "[]",
        "objective_ids_json": "[]",
        "study_object_ids_json": "[]",
    }
    files = {"file": ("orch_resource.pdf", _build_minimal_pdf_bytes(), "application/pdf")}
    create_resp = requests.post(f"{BASE_URL}/resources/", headers=AUTH_HEADERS, data=data, files=files)
    ok, detail = print_status(create_resp, "Créer ressource PDF pour orchestrateur (file)")
    if not ok:
        pytest.fail(f"Création ressource PDF échouée: {detail}")

    res_id = create_resp.json().get("id")
    resource_id_holder["id"] = res_id

    # 2) Appeler l'orchestrateur avec resource_id
    orch_data = {
        "resource_id": str(res_id),
        "ocr": "false",
        "niveau": "5ème",
        "nombre_questions": "6",
        "instructions_personnalisees": "Réponses courtes, adaptées à un niveau 5ème.",
    }
    resp = requests.post(f"{BASE_URL}/ai/analyse-texte-from-pdf", headers=AUTH_HEADERS, data=orch_data)
    _trace("orchestrateur_resource_id", resp)
    ok, detail = print_status(resp, f"Orchestrateur: analyse_texte via resource_id={res_id}")
    if not ok:
        pytest.fail(f"Échec orchestrateur (resource_id): {detail}")

    payload = resp.json()
    assert "content" in payload and isinstance(payload["content"], dict)
    assert "extraction" in payload and isinstance(payload["extraction"], dict)
    assert isinstance(payload["extraction"].get("document_markdown", ""), str)

    schema = _load_schema()
    Draft7Validator.check_schema(schema)
    validator = Draft7Validator(schema)
    errors = sorted(validator.iter_errors(payload["content"]), key=lambda e: list(e.path))
    if errors:
        formatted = "\n".join(f"- {'/'.join(map(str, e.path)) or '<root>'}: {e.message}" for e in errors)
        pytest.fail(f"Le contenu ne respecte pas le schéma analyse_texte:\n{formatted}")
