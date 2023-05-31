from fastapi.testclient import TestClient

import pytest
from server import create_app

@pytest.fixture
def test_app():
    return create_app()

@pytest.fixture
def client(test_app):
    return TestClient(test_app)

# def test_root(client):
#     response = client.get("/")
#     assert response.status_code == 200

# def test_auth_route(client):
#     response = client.get("/token")
#     assert response.status_code == 200
