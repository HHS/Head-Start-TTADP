#!/bin/bash
# Usage: ./check-lock.sh <env_name>
set -e
set -x
# Ensure jq is installed
if ! command -v jq &> /dev/null; then
  echo "jq is not installed. Installing..."
  sudo apt-get update && sudo apt-get install -y jq
fi

env_name=$1
lock_key="LOCK_${env_name^^}"

# Fetch the lock value from CircleCI project environment variables
response=$(curl -s -u "${AUTOMATION_USER_TOKEN}:" \
  -X GET \
  "https://circleci.com/api/v2/project/gh/$CIRCLE_PROJECT_USERNAME/$CIRCLE_PROJECT_REPONAME/envvar/$lock_key")

echo $response
# Check for errors in the response
if echo "$response" | jq -e '.message' >/dev/null; then
  echo "Error fetching lock: $(echo "$response" | jq -r '.message')"
  exit 1
fi

lock_value=$(echo "$response" | jq -r '.value')

if [ "$lock_value" == "null" ]; then
  echo "null"
else
  # Decode the JSON string back to JSON object
  lock_value_decoded=$(echo "$lock_value" | jq -r)
  echo "$lock_value_decoded"
fi
