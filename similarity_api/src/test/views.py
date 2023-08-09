from flask import Blueprint
# from application import db

test_app = Blueprint("test_app", __name__)

@test_app.route("/test", methods=["GET"])
def hello():
    return "<h1>Hello, World!</h1>"
