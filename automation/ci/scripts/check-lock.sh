#!/bin/bash
# Usage: ./check-lock.sh <env_name>
set -e

env_name=$1
lock_key="LOCK_${env_name^^}"

# Fetch the lock value from CircleCI project environment variables
lock_value=$(curl -s -u "${CIRCLE_API_USER_TOKEN}:" \
  -X GET \
  "https://circleci.com/api/v2/project/gh/$CIRCLE_PROJECT_USERNAME/$CIRCLE_PROJECT_REPONAME/envvar/$lock_key" | jq -r '.value')

if [ "$lock_value" == "null" ]; then
  echo "null"
else
  echo "$lock_value"
fi
