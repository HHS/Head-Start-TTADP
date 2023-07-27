import os
from cfenv import AppEnv
from fastapi import FastAPI, Depends
from fastapi.routing import APIRoute
from fastapi.security import APIKeyHeader
from fastapi.staticfiles import StaticFiles
from fastapi.openapi.utils import get_openapi
from itsdangerous import URLSafeSerializer
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from routes.auth_routes import setup_auth_routes
from routes.routes import setup_main_routes
from utilities.api_key_auth import get_api_key
from starlette.middleware import Middleware
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from starlette.middleware.httpsredirect import HTTPSRedirectMiddleware

import uvicorn
from middleware.process_time import add_process_time_header
from middleware.security_headers import add_security_headers

SECRET_KEY = "your-secret-key"
SIGNED_COOKIE_SALT = "your-cookie-salt"
serializer = URLSafeSerializer(SECRET_KEY, salt=SIGNED_COOKIE_SALT)

class BaseRoute(APIRoute):
    """
    BaseRoute class extends APIRoute and adds get_api_key dependency.
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.dependencies.append(Depends(get_api_key))

def create_app():
    """
    create_app function creates a FastAPI app, mounts static files, sets up routes and returns the app and port.
    """
    app = FastAPI(default_route_class=BaseRoute)
    # app.add_middleware(HTTPSRedirectMiddleware)
    app.middleware("http")(add_process_time_header)
    app.middleware("http")(add_security_headers)

    origins = [
        "http://ohs.acf.hhs.gov",
        "https://staging.hses.ohs.acf.hhs.gov",
        "http://ohs.acf.hhs.gov",
        "https://localhost.ohs.acf.hhs.gov",
        "http://localhost",
        "http://localhost:9300",
        "http://localhost:8000",
    ]

    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.add_middleware(
        SessionMiddleware,
        secret_key=SECRET_KEY,
        https_only=True
    )

    env = AppEnv()
    port = int(os.getenv("DATA_SCIENCE_PORT", "8000"))

    app.mount("/static", StaticFiles(directory="static"), name="static")

    # Pass app to setup_routes
    setup_main_routes(app)
    setup_auth_routes(app)
    
    def custom_openapi():
        if app.openapi_schema:
            return app.openapi_schema
        openapi_schema = get_openapi(
            title="TTA Data Science API Schema",
            version="0.1.0",
            description="Generated API Schema for TTA Data Science API",
            routes=app.routes,
        )
        app.openapi_schema = openapi_schema
        return app.openapi_schema

    app.openapi = custom_openapi

    return app, port

# These are at the module-level scope
app, port = create_app()
FastAPIInstrumentor.instrument_app(app)

if __name__ == '__main__':
    uvicorn.run(app, host='0.0.0.0', port=port)
