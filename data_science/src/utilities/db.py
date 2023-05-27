import os
import json
import psycopg2
import psycopg2.extras
from cfenv import AppEnv
from dotenv import load_dotenv



import os
import json
from dotenv import load_dotenv

def get_postgres_service():
    # Load .env file
    load_dotenv()

    # Extract VCAP_SERVICES
    vcap_services_str = os.environ.get('VCAP_SERVICES')

    if vcap_services_str is not None:
        # Parse VCAP_SERVICES
        vcap_services = json.loads(vcap_services_str)
        # Extract PostgreSQL service details
        return vcap_services['postgresql-db'][0]['credentials']
    else:
        # Fallback on .env if VCAP_SERVICES not found
        postgres_service = {
            'username': os.getenv('POSTGRES_USERNAME'),
            'password': os.getenv('POSTGRES_PASSWORD'),
            'database': os.getenv('POSTGRES_DB'),
            'hostname': os.getenv('POSTGRES_HOST'),
            'port': os.getenv('POSTGRES_PORT'),
        }

        if None in postgres_service.values():
            raise Exception('Some PostgreSQL environment variables are not set.')

        return postgres_service


def connect_to_db():
    postgres_service = get_postgres_service()

    # Connect to the PostgreSQL database
    try:
        conn = psycopg2.connect(
            host=postgres_service['hostname'],
            port=postgres_service['port'],
            user=postgres_service['username'],
            password=postgres_service['password'],
            dbname=postgres_service['database'],

        )
    except psycopg2.OperationalError as e:
        print(f"Could not connect to database: {e}")
        return None
    return conn