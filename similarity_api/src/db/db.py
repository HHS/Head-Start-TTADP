import logging

from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import text

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

def query(query_str, data):
    try:
        query_str = text(query_str)
        db.session.execute(query_str, params=data)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        logging.exception(e)
