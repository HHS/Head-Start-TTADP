import atexit
import logging
import os

from flask import Flask

from db.db import db

def create_app():
    app = Flask(__name__, static_folder='static')

    app.config.from_pyfile("settings.py")

    db.init_app(app)

    from routes.create import create_routes
    create_routes(app)

    return app

