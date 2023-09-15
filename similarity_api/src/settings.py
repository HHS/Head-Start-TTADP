import os
import json

def get_postgres_credentials_from_vcap():
    vcap_services = os.environ.get('VCAP_SERVICES')

    # Ensure VCAP_SERVICES exists and parse its JSON content
    if vcap_services:
        services = json.loads(vcap_services)

        # Assuming the PostgreSQL service key is "postgresql"
        if 'postgresql' in services:
            postgres_service = services['postgresql'][0]
            return postgres_service['credentials']

    return None

# Fetch credentials from VCAP_SERVICES or use the direct environment variables
vcap_credentials = get_postgres_credentials_from_vcap()

DB_USERNAME = os.environ.get("POSTGRES_USERNAME") or (vcap_credentials and vcap_credentials.get('username'))
DB_PASSWORD = os.environ.get("POSTGRES_PASSWORD") or (vcap_credentials and vcap_credentials.get('password'))
DB_HOST = os.environ.get("POSTGRES_HOST") or (vcap_credentials and vcap_credentials.get('host'))
DB_NAME = os.environ.get("POSTGRES_DB") or (vcap_credentials and vcap_credentials.get('database'))

SQLALCHEMY_TRACK_MODIFICATIONS = False
SQLALCHEMY_DATABASE_URI = f"postgresql://{DB_USERNAME}:{DB_PASSWORD}@{DB_HOST}:5432/{DB_NAME}"

API_KEY = os.environ["SIMILARITY_API_KEY"]
