import asyncio
import pytest

from utilities.auth import create_access_token, verify_token, authenticate_service_account, hash_password

from datetime import timedelta

def test_hash_password():
    hashed_password = hash_password()
    assert isinstance(hashed_password, str)
    assert len(hashed_password) > 0


def test_create_access_token():
    data = {"username": "testuser"}
    expires_delta = timedelta(minutes=30)
    access_token = create_access_token(data, expires_delta)
    assert isinstance(access_token, str)
    # Add additional assertions as per your requirements


def test_authenticate_service_account():
    username = "service_account1"
    password = "password"
    result = authenticate_service_account(username, password)
    assert result is not None

    invalid_username = "nonexistent_account"
    invalid_password = "invalid_password"
    result = authenticate_service_account(invalid_username, invalid_password)
    assert result is None

