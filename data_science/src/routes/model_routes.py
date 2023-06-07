from sys import prefix
from typing import Annotated
import psycopg2.extras
from utilities.auth import User, get_current_active_user, get_current_user
from utilities.db import connect_to_db
from utilities.datagen import data_generator, is_generating_data, stop_event
from threading import Thread
from models.spacy_similarity import my_calc_similarity
from fastapi.templating import Jinja2Templates
from fastapi import Request, APIRouter, Depends, HTTPException, status, FastAPI
from fastapi.security import OAuth2PasswordBearer

templates = Jinja2Templates(directory="templates")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")
unauthenticated_router = APIRouter(tags=["unauthenticated"])
authenticated_router = APIRouter(
    tags=["authenticated"],
    dependencies=[Depends(oauth2_scheme), Depends(get_current_active_user)],
)


def execute_db_query(query, parameters=()):
    conn = connect_to_db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    cur.execute(query, parameters)
    rows = cur.fetchall()
    return rows


def setup_main_routes(app):
    @authenticated_router.get(
        "/compute_similarities/{recipient_id}", tags=["data_science"]
    )
    def compute_similarities(
        recipient_id: str,
    ):
        rows = execute_db_query(
            """
            SELECT g."id", g."name"
            FROM "Goals" g
            JOIN "Grants" gr ON g."grantId" = gr.id
            JOIN "Recipients" r ON gr."recipientId" = r.id
            WHERE r.id = %s AND g.name IS NOT NULL;
            """,
            (recipient_id,),
        )
        rows = [row for row in rows if row["name"] is not None]
        cur_goals_list = [row["name"] for row in rows]
        cur_goal_ids = [row["id"] for row in rows]
        matched_goals = my_calc_similarity(recipient_id, cur_goals_list, cur_goal_ids)
        return {"matched_goals": matched_goals}

    app.include_router(authenticated_router)
    app.include_router(unauthenticated_router)
