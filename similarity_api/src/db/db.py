from flask import jsonify
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
        return None

def query_one(str, data):
    str = text(str)
    return db.session.execute(str, data).first()

    # str = text(str)
    # result = db.session.execute(str, data)
    # out = [{column: value for column, value in result.all()}]
    # return out
