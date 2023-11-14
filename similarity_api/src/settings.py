import json
import os

from apscheduler.jobstores.sqlalchemy import SQLAlchemyJobStore


def get_postgres_credentials_from_vcap():
    vcap_services = os.environ.get('VCAP_SERVICES')

    if vcap_services:
        services = json.loads(vcap_services)

        if 'aws-rds' in services:
            postgres_service = services['aws-rds'][0]
            return postgres_service['credentials']

    return None

vcap_credentials = get_postgres_credentials_from_vcap()

DB_USERNAME = os.environ.get("POSTGRES_USERNAME") or (vcap_credentials and vcap_credentials.get('username'))
DB_PASSWORD = os.environ.get("POSTGRES_PASSWORD") or (vcap_credentials and vcap_credentials.get('password'))
DB_HOST = os.environ.get("POSTGRES_HOST") or (vcap_credentials and vcap_credentials.get('host'))
DB_NAME = os.environ.get("POSTGRES_DB") or (vcap_credentials and vcap_credentials.get('db_name'))
PORT = (vcap_credentials and vcap_credentials.get('port')) or 5432

SQLALCHEMY_TRACK_MODIFICATIONS = False
SQLALCHEMY_DATABASE_URI = f"postgresql://{DB_USERNAME}:{DB_PASSWORD}@{DB_HOST}:{PORT}/{DB_NAME}"

API_KEY = os.environ.get("SIMILARITY_API_KEY")

SCHEDULER_JOBSTORES = {
  'default': SQLAlchemyJobStore(url='sqlite:///jobs.sqlite')
}
