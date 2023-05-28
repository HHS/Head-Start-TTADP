import os
import psycopg2.extras
import binascii

import requests


from utilities.db import connect_to_db
from utilities.auth import (
    Token,
    User,
    authenticate_user,
    create_access_token,
    get_current_active_user,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    fake_users_db,
)
from typing import Annotated
from fastapi.templating import Jinja2Templates
from fastapi.responses import RedirectResponse
from fastapi.security import OAuth2PasswordRequestForm
from fastapi import Depends, HTTPException, Request, status, APIRouter

from datetime import timedelta


templates = Jinja2Templates(directory="templates")


def execute_db_query(query, parameters=()):
    conn = connect_to_db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    cur.execute(query, parameters)
    rows = cur.fetchall()
    return rows


def setup_auth_routes(app):
    authenticated_router = APIRouter(tags=["authenticated"])
    unauthenticated_router = APIRouter(tags=["unauthenticated"])

    @app.post("/token", response_model=Token, tags=["auth", "unauthenticated"])
    async def login_for_access_token(
        form_data: Annotated[OAuth2PasswordRequestForm, Depends()]
    ):
        user = authenticate_user(fake_users_db, form_data.username, form_data.password)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user.username}, expires_delta=access_token_expires
        )
        return {"access_token": access_token, "token_type": "bearer"}

    @app.post("/login", tags=["auth", "unauthenticated"])
    async def login_browser_access_token(
        request: Request, form_data: OAuth2PasswordRequestForm = Depends()
    ):
        user = authenticate_user(fake_users_db, form_data.username, form_data.password)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user.username}, expires_delta=access_token_expires
        )

        # Generate a CSRF token and store it in the session
        csrf_token = binascii.hexlify(os.urandom(24)).decode()
        request.session["csrf_token"] = csrf_token

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "csrf_token": csrf_token,
        }

    @app.get("/users/me/", response_model=User, tags=["auth", "authenticated"])
    async def read_users_me(
        current_user: Annotated[User, Depends(get_current_active_user)]
    ):
        return current_user

    @app.get("/users/me/items/", tags=["auth", "authenticated"])
    async def read_own_items(
        current_user: Annotated[User, Depends(get_current_active_user)]
    ):
        return [{"item_id": "Foo", "owner": current_user.username}]

    app.include_router(authenticated_router)
    app.include_router(unauthenticated_router)
