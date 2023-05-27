import pytest
import psycopg2
import json

from utilities.db import get_postgres_service, connect_to_db  
from unittest.mock import patch

def test_get_postgres_service():
    # Mock VCAP_SERVICES environment variable
    with patch.dict('os.environ', {'VCAP_SERVICES': json.dumps({
        'postgresql-db': [
            {'credentials': {'hostname': 'test_hostname', 'port': 'test_port', 'username': 'test_username', 'password': 'test_password', 'dbname': 'test_dbname'}}
        ]
    })}):
        service = get_postgres_service()
        assert service == {'hostname': 'test_hostname', 'port': 'test_port', 'username': 'test_username', 'password': 'test_password', 'dbname': 'test_dbname'}

def test_get_postgres_service_no_env_var():
    # Test without VCAP_SERVICES environment variable
    with patch.dict('os.environ', {}, clear=True):
        with pytest.raises(Exception) as e:
            get_postgres_service()
        assert str(e.value) == 'VCAP_SERVICES environment variable not found.'

def test_connect_to_db():
    # Mock psycopg2.connect
    with patch('psycopg2.connect') as mock_connect:
        mock_connect.return_value = 'connection_object'
        with patch.dict('os.environ', {'VCAP_SERVICES': json.dumps({
            'postgresql-db': [
                {'credentials': {'hostname': 'test_hostname', 'port': 'test_port', 'username': 'test_username', 'password': 'test_password', 'dbname': 'test_dbname'}}
            ]
        })}):
            connection = connect_to_db()
            assert connection == 'connection_object'
            mock_connect.assert_called_once_with(
                host='test_hostname',
                port='test_port',
                user='test_username',
                password='test_password',
                dbname='test_dbname'
            )

def test_connect_to_db_exception():
    # Mock psycopg2.connect to raise OperationalError
    with patch('psycopg2.connect') as mock_connect:
        mock_connect.side_effect = psycopg2.OperationalError
        with patch.dict('os.environ', {'VCAP_SERVICES': json.dumps({
            'postgresql-db': [
                {'credentials': {'hostname': 'test_hostname', 'port': 'test_port', 'username': 'test_username', 'password': 'test_password', 'dbname': 'test_dbname'}}
            ]
        })}):
            connection = connect_to_db()
            assert connection is None
