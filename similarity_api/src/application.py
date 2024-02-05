import atexit
import logging
import os

from flask import Flask
from flask_apscheduler import APScheduler

from db.db import db
from sim.compute import cache_scores as cache

scheduler = APScheduler()

def create_app():
    app = Flask(__name__, static_folder='static')

    app.config.from_pyfile("settings.py")

    db.init_app(app)

    from routes.create import create_routes
    create_routes(app)

    scheduler.init_app(app)
    scheduler.start()
    scheduler.add_job(func=cache_scores, id='cache', trigger='cron', minute='0', hour='3', timezone='GMT', replace_existing=True, max_instances=1)

    atexit.register(lambda: scheduler.shutdown(wait=False))

    # By default, APScheduler logs are a bit noisy.
    log_level = os.environ.get("SIMILARITY_SCHEDULER_LOG_LEVEL", "DEBUG")
    logging.getLogger("apscheduler.scheduler").setLevel(logging.getLevelName(log_level))
    logging.getLogger('apscheduler.executors.default').propagate = False

    return app

def cache_scores():
    logging.info('Caching scores')
    with scheduler.app.app_context():
      cache()
