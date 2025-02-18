import logging
import os

from application import create_app

log_level = os.environ.get("SIMILARITY_LOG_LEVEL", "INFO")
logging.basicConfig(level=logging.getLevelName(log_level))

app = create_app()

if __name__ == "__main__":
    app.run()
