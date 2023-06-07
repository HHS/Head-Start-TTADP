import pytest
import psycopg2
import json

from utilities.db import get_postgres_service, connect_to_db
from unittest.mock import patch


def test_get_postgres_service():
    # Mock VCAP_SERVICES environment variable
    with patch.dict(
        "os.environ",
        {
            "VCAP_SERVICES": json.dumps(
                {
                    "aws-rds": [
                        {
                            "credentials": {
                                "host": "test_hostname",
                                "port": "test_port",
                                "username": "test_username",
                                "password": "test_password",
                                "db_name": "test_dbname",
                            }
                        }
                    ]
                }
            )
        },
    ):
        service = get_postgres_service()
        assert service == {
            "host": "test_hostname",
            "port": "test_port",
            "username": "test_username",
            "password": "test_password",
            "db_name": "test_dbname",
        }


def test_get_postgres_service_no_env_var():
    # Test without VCAP_SERVICES environment variable
    with patch.dict(
        "os.environ",
        {
            "POSTGRES_USERNAME": "",
            "POSTGRES_PASSWORD": "",
            "POSTGRES_DB": "",
            "POSTGRES_HOST": "",
            "POSTGRES_PORT": "",
        },
        clear=True,
    ):
        with pytest.raises(Exception) as e:
            get_postgres_service()
        assert str(e.value) == "Some PostgreSQL environment variables are not set."


def test_connect_to_db():
    # Mock psycopg2.connect
    with patch("psycopg2.connect") as mock_connect:
        mock_connect.return_value = "connection_object"
        with patch.dict(
            "os.environ",
            {
                "VCAP_SERVICES": json.dumps(
                    {
                        "aws-rds": [
                            {
                                "credentials": {
                                    "host": "test_hostname",
                                    "port": "test_port",
                                    "username": "test_username",
                                    "password": "test_password",
                                    "db_name": "test_dbname",
                                }
                            }
                        ]
                    }
                )
            },
        ):
            connection = connect_to_db()
            assert connection == "connection_object"
            mock_connect.assert_called_once_with(
                host="test_hostname",
                port="test_port",
                user="test_username",
                password="test_password",
                database="test_dbname",
            )


def test_connect_to_db_exception():
    # Mock psycopg2.connect to raise OperationalError
    with patch("psycopg2.connect") as mock_connect:
        mock_connect.side_effect = psycopg2.OperationalError("Database connection failed")
        with patch.dict(
            "os.environ",
            {
                "VCAP_SERVICES": json.dumps(
                    {
                        "aws-rds": [
                            {
                                "credentials": {
                                    "host": "test_hostname",
                                    "port": "test_port",
                                    "username": "test_username",
                                    "password": "test_password",
                                    "db_name": "test_dbname",
                                }
                            }
                        ]
                    }
                )
            },
        ):
            with pytest.raises(Exception) as e_info:
                connect_to_db()
            assert str(e_info.value) == "Could not connect to database: Database connection failed"

