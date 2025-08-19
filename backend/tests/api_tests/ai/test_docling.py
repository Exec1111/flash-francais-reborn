import requests
import base64
import os
import pytest
from ...utils import BASE_URL, HEADERS, print_status

# En-têtes sans Content-Type pour laisser requests définir correctement le multipart
AUTH_HEADERS = {k: v for k, v in HEADERS.items() if k.lower() != "content-type"}


def _mask_token(token: str | None) -> str | None:
    if not token:
        return None
    # Masquer la grande majorité du token pour éviter toute fuite
    return (token[:12] + "..." + token[-6:]) if len(token) > 24 else "***masked***"


def _trace_auth_state(ctx: str) -> None:
    """Affiche des traces sur la configuration d'auth pour diagnostiquer les skips."""
    if str(os.getenv("TEST_TRACE", "")).strip().lower() not in {"1", "true", "yes", "on"}:
        return
    env_tok = os.getenv("TEST_AUTH_TOKEN")
    print(f"[TRACE][{ctx}] BASE_URL={BASE_URL}")
    print(
        f"[TRACE][{ctx}] TEST_AUTH_TOKEN present={env_tok is not None}, startswith_bearer={(env_tok or '').startswith('Bearer ')}, token={_mask_token(env_tok)}"
    )
    print(
        f"[TRACE][{ctx}] HEADERS.Authorization present={'Authorization' in HEADERS}, value={_mask_token(HEADERS.get('Authorization')) if isinstance(HEADERS.get('Authorization'), str) else HEADERS.get('Authorization')}"
    )
    print(
        f"[TRACE][{ctx}] AUTH_HEADERS.Authorization present={'Authorization' in AUTH_HEADERS}, keys={list(AUTH_HEADERS.keys())}"
    )


def _build_minimal_pdf_bytes() -> bytes:
    """Construit un petit PDF valide en bytes (Hello PDF)."""
    # PDF minimal simple; testé généralement par les parseurs
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


def test_docling_extract_upload_pdf_success():
    _trace_auth_state("upload_pdf_success")
    if "Authorization" not in AUTH_HEADERS:
        pytest.skip("Skipping Docling upload test: AUTH token manquant (TEST_AUTH_TOKEN).")

    files = {
        "file": ("test.pdf", _build_minimal_pdf_bytes(), "application/pdf"),
    }
    data = {"ocr": "false"}

    resp = requests.post(f"{BASE_URL}/docling/extract", headers=AUTH_HEADERS, data=data, files=files)
    ok, detail = print_status(resp, "Docling: extraction via upload PDF")
    if not ok:
        pytest.fail(f"Échec extraction upload PDF: {detail}")

    payload = resp.json()
    assert "document_markdown" in payload
    assert "tables" in payload and isinstance(payload["tables"], list)
    pass


def test_docling_extract_via_resource_id_success(resource_id_holder):
    _trace_auth_state("via_resource_id_success")
    if "Authorization" not in AUTH_HEADERS:
        pytest.skip("Skipping Docling resource_id test: AUTH token manquant (TEST_AUTH_TOKEN).")

    # 1) Créer une ressource avec source_type 'file' (upload PDF)
    data = {
        "title": "Ressource PDF Docling",
        "description": "PDF pour test Docling",
        "type_id": 1,
        "sub_type_id": 1,
        "source_type": "file",
        "session_ids_json": "[]",
        "objective_ids_json": "[]",
        "study_object_ids_json": "[]",
    }
    files = {
        "file": ("docling_resource.pdf", _build_minimal_pdf_bytes(), "application/pdf"),
    }
    create_resp = requests.post(f"{BASE_URL}/resources/", headers=AUTH_HEADERS, data=data, files=files)
    ok, detail = print_status(create_resp, "Créer ressource PDF pour Docling (file)")
    if not ok:
        pytest.fail(f"Création ressource PDF échouée: {detail}")

    res_id = create_resp.json().get("id")
    resource_id_holder["id"] = res_id

    # 2) Appeler Docling avec resource_id
    extract_data = {
        "resource_id": str(res_id),
        "ocr": "false",
    }
    resp = requests.post(f"{BASE_URL}/docling/extract", headers=AUTH_HEADERS, data=extract_data)
    ok, detail = print_status(resp, f"Docling: extraction via resource_id={res_id}")
    if not ok:
        pytest.fail(f"Échec extraction via resource_id: {detail}")

    payload = resp.json()
    assert "document_markdown" in payload
    assert "tables" in payload and isinstance(payload["tables"], list)
    pass


def test_docling_extract_mutual_exclusion_error():
    _trace_auth_state("mutual_exclusion_error")
    if "Authorization" not in AUTH_HEADERS:
        pytest.skip("Skipping Docling mutual exclusion test: AUTH token manquant (TEST_AUTH_TOKEN).")

    files = {
        "file": ("both.pdf", _build_minimal_pdf_bytes(), "application/pdf"),
    }
    data = {
        "resource_id": "999999",
        "ocr": "false",
    }
    resp = requests.post(f"{BASE_URL}/docling/extract", headers=AUTH_HEADERS, data=data, files=files)
    # On attend 400
    ok = resp.status_code == 400
    print_status(resp, "Docling: erreur resource_id + file fournis (400)", expected_code=400)
    assert ok


def test_docling_extract_wrong_mime_error():
    _trace_auth_state("wrong_mime_error")
    if "Authorization" not in AUTH_HEADERS:
        pytest.skip("Skipping Docling wrong MIME test: AUTH token manquant (TEST_AUTH_TOKEN).")

    files = {
        "file": ("not_pdf.txt", b"Hello txt", "text/plain"),
    }
    resp = requests.post(f"{BASE_URL}/docling/extract", headers=AUTH_HEADERS, files=files)
    # On attend 400
    ok = resp.status_code == 400
    print_status(resp, "Docling: erreur MIME non PDF (400)", expected_code=400)
    assert ok


def test_docling_extract_too_large_error():
    _trace_auth_state("too_large_error")
    if "Authorization" not in AUTH_HEADERS:
        pytest.skip("Skipping Docling too large test: AUTH token manquant (TEST_AUTH_TOKEN).")

    # Construire un payload > 10 Mo (par défaut). 11 Mo.
    huge_bytes = b"%PDF-1.4\n" + (b"0" * (11 * 1024 * 1024))
    files = {
        "file": ("huge.pdf", huge_bytes, "application/pdf"),
    }
    resp = requests.post(f"{BASE_URL}/docling/extract", headers=AUTH_HEADERS, files=files)
    # On attend 413
    ok = resp.status_code == 413
    print_status(resp, "Docling: erreur fichier trop volumineux (413)", expected_code=413)
    assert ok


def test_docling_extract_resource_not_found_error():
    _trace_auth_state("resource_not_found_error")
    if "Authorization" not in AUTH_HEADERS:
        pytest.skip("Skipping Docling resource not found test: AUTH token manquant (TEST_AUTH_TOKEN).")

    data = {"resource_id": "999999999"}
    resp = requests.post(f"{BASE_URL}/docling/extract", headers=AUTH_HEADERS, data=data)
    ok = resp.status_code == 404
    print_status(resp, "Docling: ressource inexistante (404)", expected_code=404)
    assert ok
