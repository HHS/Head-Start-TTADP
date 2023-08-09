from flask import Flask
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

def create_app():
    app = Flask(__name__, static_folder='static')
    app.config.from_pyfile("settings.py")
    db.init_app(app)
    from test.views import test_app
    app.register_blueprint(test_app)
    from routes.create import create_routes
    create_routes(app)
    return app
