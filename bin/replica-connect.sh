#!/usr/bin/env bash

set -euo pipefail

if [ $# -eq 0 ]; then
    echo "Usage: $0 app_name"
    echo "Example: $0 tta-smarthub-prod"
    exit 1
fi

APP_NAME="$1"

RAW_DATA=$(cf ssh $APP_NAME -c 'echo $VCAP_SERVICES')

# parse
REPLICA_HOST=$(echo $RAW_DATA | jq --raw-output '.["aws-rds"][0] | .credentials | .replica_host')

PORT=$(echo $RAW_DATA | jq --raw-output '.["aws-rds"][0] | .credentials | .port')
USER=$(echo $RAW_DATA | jq --raw-output '.["aws-rds"][0] | .credentials | .username')
PASSWD=$(echo $RAW_DATA | jq --raw-output '.["aws-rds"][0] | .credentials | .password')
DB_NAME=$(echo $RAW_DATA | jq --raw-output '.["aws-rds"][0] | .credentials | .db_name')

# Ensure the port is available, kill any other process using it
lsof -t -i ":${PORT}" | xargs kill 2>/dev/null || true

cleanup() {
    echo "Cleaning up..."
    if [ -n "$SSH_PID" ]; then
        kill $SSH_PID
        echo "SSH tunnel closed."
    fi
    exit 0
}

trap 'cleanup' EXIT

tunnel_cmd="cf ssh -N -L ${PORT}:${REPLICA_HOST}:${PORT} $APP_NAME"
$tunnel_cmd &
SSH_PID=$!
echo "Establishing SSH tunnel with PID: $SSH_PID"
sleep 3  # Wait for the SSH tunnel to establish

echo "Connecting to db replica for ${APP_NAME} on port ${PORT}..."
#echo "Password: ${PASSWD}" # Uncomment if password prompt is triggered
export PGPASSWORD=$PASSWD; psql -h localhost -p ${PORT} -U ${USER} -d ${DB_NAME}