import pytest
from unittest.mock import Mock
from passlib.context import CryptContext
from utilities.auth import verify_password, get_password_hash, get_user, authenticate_user

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def test_verify_password():
    password = "my_password"
    hashed_password = pwd_context.hash(password)
    assert verify_password(password, hashed_password)

def test_get_password_hash():
    password = "my_password"
    hashed_password = get_password_hash(password)
    assert pwd_context.verify(password, hashed_password)

def test_get_user():
    fake_db = {"testuser": {"username": "testuser", "hashed_password": "hashed_password"}}
    user = get_user(fake_db, "testuser")
    assert user.username == "testuser"

def test_authenticate_user():
    password = "my_password"
    hashed_password = pwd_context.hash(password)
    fake_db = {"testuser": {"username": "testuser", "hashed_password": hashed_password}}
    user = authenticate_user(fake_db, "testuser", password)
    assert user is not None
