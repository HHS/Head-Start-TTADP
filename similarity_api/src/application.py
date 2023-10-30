import logging
import atexit

from flask import Flask
from db.db import db
from sim.compute import cache_scores as cache
from flask_apscheduler import APScheduler

scheduler = APScheduler()

atexit.register(lambda: scheduler.shutdown(wait=False))

def create_app():
    app = Flask(__name__, static_folder='static')

    app.config.from_pyfile("settings.py")

    db.init_app(app)

    from routes.create import create_routes
    create_routes(app)

    scheduler.init_app(app)
    scheduler.start()
    scheduler.add_job(func=cache_scores, id='cache', trigger='interval', seconds=10, timezone='EST')

    # By default, APScheduler logs are a bit noisy.
    logging.getLogger("apscheduler.scheduler").setLevel(logging.DEBUG)
    logging.getLogger('apscheduler.executors.default').propagate = False

    return app

def cache_scores():
    logging.info('Caching scores')
    with scheduler.app.app_context():
      cache()
