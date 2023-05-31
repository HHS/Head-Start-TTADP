from typing import Annotated
import psycopg2.extras
from utilities.auth import User, get_current_active_user, get_current_user

from utilities.db import connect_to_db
from utilities.datagen import data_generator, is_generating_data, stop_event
from threading import Thread
from models.spacy_similarity import my_calc_similarity
from fastapi.templating import Jinja2Templates
from fastapi import Request, APIRouter, Depends, HTTPException, status, FastAPI


templates = Jinja2Templates(directory="templates")


def execute_db_query(query, parameters=()):
    conn = connect_to_db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    cur.execute(query, parameters)
    rows = cur.fetchall()
    return rows


def setup_main_routes(app):
    authenticated_router = APIRouter(tags=["authenticated"])
    unauthenticated_router = APIRouter(tags=["unauthenticated"])

    @app.get("/", tags=["unauthenticated"])
    def index(request: Request):
        return templates.TemplateResponse("index.html", {"request": request})

    @app.post("/start_datagen", tags=["datagen", "authenticated"])
    def start_generating_data(
        current_user: Annotated[User, Depends(get_current_active_user)]
    ):
        global is_generating_data, data_gen_thread, stop_event
        if not is_generating_data:
            stop_event.clear()  # Reset the stop_event
            is_generating_data = True
            data_gen_thread = Thread(target=data_generator)
            data_gen_thread.start()
        return {"status": "Data generation started"}

    @app.post("/stop_datagen", tags=["datagen", "authenticated"])
    def stop_generating_data(
        current_user: Annotated[User, Depends(get_current_active_user)]
    ):
        print("Stop button pressed")
        global is_generating_data, stop_event
        if is_generating_data:
            is_generating_data = False
            stop_event.set()
            if data_gen_thread is not None:
                data_gen_thread.join()  # It will now successfully join because of the 'stop_event'
        return {"status": "Data generation stopped"}

    @app.post("/clear_datagen_db", tags=["datagen", "authenticated"])
    def clear_database(current_user: Annotated[User, Depends(get_current_active_user)]):
        global is_generating_data, stop_event
        if is_generating_data:
            is_generating_data = False
            stop_event.set()
            if data_gen_thread is not None:
                data_gen_thread.join()  # It will now successfully join because of the 'stop_event'
        conn = connect_to_db()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        try:
            cur.execute('DELETE FROM "Goals";')
            conn.commit()
            print("Database cleared successfully.")
        except Exception as e:
            print(f"Error occurred while clearing the database: {e}")
            conn.rollback()
        return {"status": "Database cleared"}

    @app.get("/last_five_entries_auth", tags=["db_query", "authenticated"])
    async def last_five_entries_auth(
        current_user: Annotated[User, Depends(get_current_active_user)]
    ):
        conn = connect_to_db()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        cur.execute('SELECT * FROM "Goals" ORDER BY id DESC LIMIT 5;')
        rows = cur.fetchall()
        return {"lastFiveEntries": [dict(row) for row in rows]}

    @app.get("/last_five_entries_auth_dry", tags=["db_query", "authenticated"])
    async def last_five_entries_auth_dry(
        current_user: Annotated[User, Depends(get_current_active_user)]
    ):
        rows = execute_db_query('SELECT * FROM "Goals" ORDER BY id DESC LIMIT 5;')
        return {"lastFiveEntries": [dict(row) for row in rows]}

    @app.get("/last_five_entries", tags=["db_query", "authenticated"])
    async def last_five_entries():
        rows = execute_db_query('SELECT * FROM "Goals" ORDER BY id DESC LIMIT 5;')
        return {"lastFiveEntries": [dict(row) for row in rows]}

    @app.get("/fetch_recipients_ids", tags=["db_query", "authenticated"])
    def fetch_recipient_ids(
        request: Request,
        current_user: Annotated[User, Depends(get_current_active_user)],
    ):
        rows = execute_db_query(
            """
            SELECT DISTINCT id FROM "Recipients";
            """
        )
        return {"user_ids": [dict(row) for row in rows]}

    @app.get(
        "/compute_similarities/{recipient_id}", tags=["data_science", "authenticated"]
    )
    def compute_similarities(
        recipient_id: str,
        current_user: Annotated[User, Depends(get_current_active_user)],
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

    @app.get("/protected_endpoint", tags=["authenticated"])
    def protected_endpoint(
        current_user: Annotated[User, Depends(get_current_active_user)]
    ):
        # Only authenticated users can access this endpoint
        return {"message": "Hello, authenticated user!"}

    @app.get("/unprotected_endpoint", tags=["unauthenticated"])
    def unprotected_endpoint():
        # This endpoint is accessible to all users
        return {"message": "Hello, everyone!"}

    app.include_router(authenticated_router)
    app.include_router(unauthenticated_router)
