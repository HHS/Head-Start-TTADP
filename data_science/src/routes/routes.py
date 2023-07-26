import threading
from typing import Annotated, Dict, List, Union,Tuple

import psycopg2.extras
from fastapi import APIRouter, Depends, FastAPI, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from fastapi.templating import Jinja2Templates

from models.spacy_similarity import calculate_goal_similarity
from models.spacy_similarity_scores import calculate_similarity_scores

from utilities.auth import User, get_current_active_user
from utilities.api_key_auth import get_api_key
from utilities.db import connect_to_db
from utilities.datagen import data_generator, is_generating_data, stop_event

templates = Jinja2Templates(directory="templates")

# oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")
unauthenticated_router = APIRouter(tags=["unauthenticated"])
authenticated_router = APIRouter(
    tags=["authenticated"],
    # dependencies=[Depends(oauth2_scheme), Depends(get_current_active_user)],
    dependencies=[Depends(get_api_key)],
    
)


def execute_db_query(query: str, parameters: Union[Tuple, List, Dict] = ()) -> List[Dict]:
    try:
        conn = connect_to_db()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        cur.execute(query, parameters)
        rows = cur.fetchall()
        return [dict(row) for row in rows]
    except Exception as e:
        print(f"Error: {e}")


def setup_main_routes(app: FastAPI) -> None:
    @unauthenticated_router.get("/", tags=["unauthenticated"])
    def index(request: Request):
        return templates.TemplateResponse("index.html", {"request": request})
    
    ## Data Generation Routes, not needed for production but can be helpful for testing locally

    # @authenticated_router.post("/dev/start_datagen", tags=["datagen"])
    # def start_generating_data() -> Dict[str, str]:
    #     global is_generating_data
    #     global data_gen_thread
    #     global stop_event
    #     if not is_generating_data:
    #         stop_event.clear()  # Reset the stop_event
    #         is_generating_data = True
    #         data_gen_thread = threading.Thread(target=data_generator)
    #         data_gen_thread.start()
    #     return {"status": "Data generation started"}

    # @authenticated_router.post("/dev/stop_datagen", tags=["datagen"])
    # def stop_generating_data() -> Dict[str, str]:
    #     print("Stop button pressed")
    #     global is_generating_data
    #     global stop_event
    #     if is_generating_data:
    #         is_generating_data = False
    #         stop_event.set()
    #         if data_gen_thread is not None:
    #             data_gen_thread.join()  # It will now successfully join because of the 'stop_event'
    #     return {"status": "Data generation stopped"}

    # @authenticated_router.post("/dev/clear_datagen_db", tags=["datagen"])
    # def clear_database() -> Dict[str, str]:
    #     global is_generating_data
    #     global stop_event
    #     if is_generating_data:
    #         is_generating_data = False
    #         stop_event.set()
    #         if data_gen_thread is not None:
    #             data_gen_thread.join()  # It will now successfully join because of the 'stop_event'
    #     conn = connect_to_db()
    #     cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    #     try:
    #         cur.execute('DELETE FROM "Goals";')
    #         conn.commit()
    #         print("Database cleared successfully.")
    #     except Exception as error:
    #         print(f"Error occurred while clearing the database: {error}")
    #         conn.rollback()
    #     return {"status": "Database cleared"}

    @authenticated_router.get("/last_five_entries_auth", tags=["db_query"])
    async def last_five_entries_auth() -> Dict[str, List[Dict]]:
        conn = connect_to_db()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        cur.execute('SELECT * FROM "Goals" ORDER BY id DESC LIMIT 5;')
        rows = cur.fetchall()
        return {"lastFiveEntries": [dict(row) for row in rows]}

    @authenticated_router.get("/fetch_recipients_ids", tags=["db_query"])
    def fetch_recipient_ids(
        current_user: Annotated[User, Depends(get_current_active_user)],
    ) -> Dict[str, List[Dict]]:
        rows = execute_db_query(
            """
            SELECT DISTINCT id FROM "Recipients";
            """
        )
        return {"user_ids": rows}

    @authenticated_router.get(
        "/compute_goal_similarities/{recipient_id}", tags=["data_science"]
    )
    def compute_goal_similarities(
        recipient_id: str,
    ) -> Dict[str, List[Dict]]:
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
        if rows is not None:
            rows = [row for row in rows if row["name"] is not None]
            cur_goals_list = [row["name"] for row in rows]
            cur_goal_ids = [row["id"] for row in rows]
            matched_goals = calculate_goal_similarity(cur_goals_list, cur_goal_ids)
            return {"matched_goals": matched_goals}
        else:
            return {"error": "No rows returned from the database"}
        
    @authenticated_router.get(
        "/compute_similarities_scores/{recipient_id}", tags=["data_science"]
    )
    def compute_similarities_scores(
        recipient_id: str,
    ) -> Dict[str, List[Dict]]:
        rows = execute_db_query(
            """
            SELECT g."id", g."name"
            FROM "Goals" g
            JOIN "Grants" gr ON g."grantId" = gr.id
            JOIN "Recipients" r ON gr."recipientId" = r.id
            """,
            (recipient_id,),
        )
        if rows is not None:
            rows = [row for row in rows if row["name"] is not None]
            cur_goals_list = [row["name"] for row in rows]
            cur_goal_ids = [row["id"] for row in rows]
            matched_goals = calculate_similarity_scores(cur_goals_list, cur_goal_ids)
            return {"matched_goals": matched_goals}
        else:
            return {"error": "No rows returned from the database"}

    app.include_router(authenticated_router)
    app.include_router(unauthenticated_router)
