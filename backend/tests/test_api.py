import os
from datetime import datetime

# Set before app imports so tests never connect to the application database.
os.environ["DATABASE_URL"] = "sqlite://"
os.environ["APP_NAME"] = "OpsFlow API"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool
from app import main
from app.db import Base, get_db


@pytest.fixture
def client(monkeypatch):
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    monkeypatch.setattr(main, "engine", engine)

    def test_db():
        with Session(engine) as session:
            yield session

    main.app.dependency_overrides[get_db] = test_db
    # Context manager executes startup against this test's isolated engine.
    with TestClient(main.app) as test_client:
        yield test_client
    main.app.dependency_overrides.clear()
    Base.metadata.drop_all(engine)
    engine.dispose()


def create(client, **fields):
    response = client.post("/api/incidents", json={"title": "Checkout errors", "service": "checkout-api", **fields})
    assert response.status_code == 201, response.text
    return response.json()


def test_operational_endpoints(client):
    root = client.get("/")
    assert root.status_code == 200
    assert root.json() == {"service": "OpsFlow API", "version": "1.0.0", "docs": "/docs"}
    assert client.get("/health").json() == {"status": "UP"}
    assert client.get("/ready").json() == {"status": "READY"}
    metrics = client.get("/metrics")
    assert metrics.status_code == 200
    assert "# HELP" in metrics.text


def test_empty_dashboard(client):
    assert client.get("/api/incidents").json() == []
    response = client.get("/api/incidents/stats")
    assert response.status_code == 200
    assert response.json() == dict(total=0, open=0, investigating=0, critical=0, resolved=0)


def test_crud_and_timestamps(client):
    incident = create(client)
    assert set(incident) == {"id", "title", "description", "service", "severity", "status", "assignee", "created_at", "updated_at"}
    assert incident["description"] == ""
    assert incident["severity"] == "MEDIUM"
    assert incident["status"] == "OPEN"
    assert incident["assignee"] == "Unassigned"
    assert datetime.fromisoformat(incident["updated_at"]) >= datetime.fromisoformat(incident["created_at"])
    url = f"/api/incidents/{incident['id']}"
    assert client.get(url).json() == incident
    response = client.put(url, json={"status": "INVESTIGATING", "description": "Checking logs", "assignee": "On-call"})
    assert response.status_code == 200
    updated = response.json()
    assert updated["title"] == incident["title"]
    assert updated["service"] == incident["service"]
    assert updated["created_at"] == incident["created_at"]
    assert updated["updated_at"] > incident["updated_at"]
    assert updated["status"] == "INVESTIGATING"
    assert updated["description"] == "Checking logs"
    assert updated["assignee"] == "On-call"
    assert client.put(url, json={}).json() == updated
    response = client.delete(url)
    assert response.status_code == 204
    assert response.content == b""
    assert client.get(url).status_code == 404


@pytest.mark.parametrize("severity", ["LOW", "MEDIUM", "HIGH", "CRITICAL"])
@pytest.mark.parametrize("status", ["OPEN", "INVESTIGATING", "RESOLVED"])
def test_all_enum_values(client, severity, status):
    incident = create(client, severity=severity, status=status)
    assert incident["severity"] == severity
    assert incident["status"] == status


@pytest.mark.parametrize("fields", [
    {"title": ""}, {"title": "  "}, {"title": "x" * 201},
    {"service": ""}, {"service": "\t"}, {"service": "x" * 121},
    {"assignee": "x" * 121}, {"severity": "URGENT"}, {"status": "DONE"},
    *[{field: None} for field in ["title", "description", "service", "severity", "status", "assignee"]],
])
def test_invalid_create_and_update(client, fields):
    incident = create(client)
    payload = {"title": "Failure", "service": "api", **fields}
    assert client.post("/api/incidents", json=payload).status_code == 422
    assert client.put(f"/api/incidents/{incident['id']}", json=fields).status_code == 422
    assert client.get(f"/api/incidents/{incident['id']}").json() == incident


@pytest.mark.parametrize("payload", [{}, {"title": "Failure"}, {"service": "api"}])
def test_required_fields(client, payload):
    assert client.post("/api/incidents", json=payload).status_code == 422


def test_missing_incidents(client):
    for method, kwargs in [(client.get, {}), (client.put, {"json": {"status": "RESOLVED"}}), (client.delete, {})]:
        response = method("/api/incidents/999", **kwargs)
        assert response.status_code == 404
        assert response.json()["detail"] == "Incident not found"
    assert client.get("/api/incidents/not-an-id").status_code == 422


def test_stats_and_newest_first(client):
    first = create(client, severity="CRITICAL")
    second = create(client, severity="CRITICAL", status="INVESTIGATING")
    create(client, severity="CRITICAL", status="RESOLVED")
    last = create(client, severity="LOW")
    assert client.get("/api/incidents/stats").json() == dict(total=4, open=2, investigating=1, critical=2, resolved=1)
    assert [item["id"] for item in client.get("/api/incidents").json()] == [last["id"], last["id"] - 1, second["id"], first["id"]]
    assert client.put(f"/api/incidents/{first['id']}", json={"status": "RESOLVED"}).status_code == 200
    assert client.get("/api/incidents/stats").json() == dict(total=4, open=1, investigating=1, critical=1, resolved=2)
    assert client.delete(f"/api/incidents/{second['id']}").status_code == 204
    assert client.get("/api/incidents/stats").json() == dict(total=3, open=1, investigating=0, critical=0, resolved=2)


def test_edit_details_and_trim_required_text(client):
    incident = create(client, title="  API timeout  ", service="  gateway  ")
    assert incident["title"] == "API timeout"
    assert incident["service"] == "gateway"
    updated = client.put(f"/api/incidents/{incident['id']}", json={"title": "Gateway recovered", "service": "edge", "severity": "LOW", "assignee": "", "description": ""})
    assert updated.status_code == 200
    assert updated.json()["title"] == "Gateway recovered"
    assert updated.json()["service"] == "edge"
    assert updated.json()["severity"] == "LOW"
