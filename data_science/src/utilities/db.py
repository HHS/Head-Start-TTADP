import os
import json
import psycopg2
import psycopg2.extras
from cfenv import AppEnv
from dotenv import load_dotenv


def get_postgres_service():
    """
    Retrieves PostgreSQL service credentials from either VCAP_SERVICES or .env file.

    Returns:
        dict: A dictionary containing the PostgreSQL service credentials.
    """
    # Load .env file
    load_dotenv()

    # Extract VCAP_SERVICES
    if "VCAP_SERVICES" in os.environ:
        vcap_services = os.environ["VCAP_SERVICES"]
        if vcap_services:
            try:
                vcap_services = json.loads(vcap_services)
                return vcap_services["aws-rds"][0]["credentials"]
            except json.JSONDecodeError as e:
                raise Exception("Invalid JSON string in VCAP_SERVICES") from e
        else:
            raise Exception("VCAP_SERVICES is empty")
    else:
        # Fallback on .env if VCAP_SERVICES not found
        postgres_service = {
            "db_name": os.getenv("POSTGRES_DB"),
            "host": os.getenv("POSTGRES_HOST"),
            "name": os.getenv("POSTGRES_NAME"),
            "password": os.getenv("POSTGRES_PASSWORD"),
            "port": os.getenv("POSTGRES_PORT"),
            "uri": os.getenv("POSTGRES_URI"),
            "username": os.getenv("POSTGRES_USERNAME")
        }

    if '' in postgres_service.values():
        raise Exception("Some PostgreSQL environment variables are not set.")

    return postgres_service


def connect_to_db():
    postgres_service = get_postgres_service()

    # Connect to the PostgreSQL database
    try:
        conn = psycopg2.connect(
            host=postgres_service["host"],
            port=postgres_service["port"],
            user=postgres_service["username"],
            password=postgres_service["password"],
            database=postgres_service["db_name"],
        )
    except psycopg2.OperationalError as e:
        raise Exception(f"Could not connect to database: {e}")
    return conn
