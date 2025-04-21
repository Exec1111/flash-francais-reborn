import pytest
from fastapi.testclient import TestClient
from app import app

client = TestClient(app)

@pytest.fixture(scope="session")
def token():
    response = client.post(
        "/api/v1/auth/token",
        data={"username": "julien.vachey@gmail.com", "password": "aaaaaaaa"}
    )
    assert response.status_code == 200
    return response.json()["access_token"]

@pytest.fixture
def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


def test_study_object_crud_and_associations(auth_headers):
    # Créer une progression
    prog_payload = {"title": "Prog Test", "description": "Desc Test", "order": 0}
    resp_prog = client.post("/api/v1/progressions/", json=prog_payload, headers=auth_headers)
    assert resp_prog.status_code == 200
    prog_id = resp_prog.json()["id"]

    # Créer un objet d'étude
    so_payload = {"title": "SO Test", "description": "Desc SO", "progression_ids": [prog_id], "resource_ids": []}
    resp_so = client.post("/api/v1/study_objects/", json=so_payload, headers=auth_headers)
    assert resp_so.status_code == 200
    so_data = resp_so.json()
    so_id = so_data["id"]
    assert so_data["title"] == "SO Test"
    assert prog_id in so_data["progression_ids"]

    # Récupérer l'objet d'étude
    resp_get = client.get(f"/api/v1/study_objects/{so_id}", headers=auth_headers)
    assert resp_get.status_code == 200
    assert resp_get.json()["id"] == so_id

    # Récupérer tous les objets d'étude
    resp_all = client.get("/api/v1/study_objects/", headers=auth_headers)
    assert resp_all.status_code == 200
    assert any(item["id"] == so_id for item in resp_all.json())

    # Mettre à jour l'objet d'étude
    resp_up = client.patch(f"/api/v1/study_objects/{so_id}", json={"title": "SO Updated"}, headers=auth_headers)
    assert resp_up.status_code == 200
    assert resp_up.json()["title"] == "SO Updated"

    # Détacher la progression
    resp_det = client.delete(f"/api/v1/study_objects/{so_id}/progressions/{prog_id}", headers=auth_headers)
    assert resp_det.status_code == 200
    assert prog_id not in resp_det.json()["progression_ids"]

    # Ré-attacher la progression
    resp_att = client.post(f"/api/v1/study_objects/{so_id}/progressions/{prog_id}", headers=auth_headers)
    assert resp_att.status_code == 200
    assert prog_id in resp_att.json()["progression_ids"]

    # Supprimer l'objet d'étude
    resp_del = client.delete(f"/api/v1/study_objects/{so_id}", headers=auth_headers)
    assert resp_del.status_code == 204


def test_nonexistent_study_object(auth_headers):
    # Récupérer inexistant
    resp = client.get("/api/v1/study_objects/99999", headers=auth_headers)
    assert resp.status_code == 404
    # Supprimer inexistant
    resp2 = client.delete("/api/v1/study_objects/99999", headers=auth_headers)
    assert resp2.status_code == 404
