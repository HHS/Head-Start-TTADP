from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import text

import logging

db = SQLAlchemy()

def query_many(query_str, data):
    try:
        query_str = text(query_str)
        result = db.session.execute(query_str, data).all()
        out = [{column: value for column, value in row._mapping.items()} for row in result]
        return out
    except Exception as e:
        logging.exception(e)
        return None

