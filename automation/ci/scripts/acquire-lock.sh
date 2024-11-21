#!/bin/bash
# Usage: ./acquire-lock.sh <env_name>
set -e

# Ensure jq is installed
if ! command -v jq &> /dev/null; then
  echo "jq is not installed. Installing..."
  sudo apt-get update && sudo apt-get install -y jq
fi

env_name=$1
lock_key="LOCK_${env_name^^}"
current_time=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
current_build_id=$CIRCLE_WORKFLOW_ID

# Create lock payload as a JSON string
lock_payload=$(jq -n \
  --arg branch "$CIRCLE_BRANCH" \
  --arg build_id "$current_build_id" \
  --arg timestamp "$current_time" \
  '{branch: $branch, build_id: $build_id, timestamp: $timestamp}')

# Escape the lock_payload string for JSON
lock_payload_escaped=$(echo "$lock_payload" | jq -aRs .)

# Construct the API request payload
api_payload=$(jq -n \
  --arg name "$lock_key" \
  --arg value "$lock_payload" \
  '{name: $name, value: $value}')

# Send the request to set the environment variable
response=$(curl -s -u "${AUTOMATION_USER_TOKEN}:" \
  -X POST \
  -H "Content-Type: application/json" \
  -d "$api_payload" \
  "https://circleci.com/api/v2/project/gh/$CIRCLE_PROJECT_USERNAME/$CIRCLE_PROJECT_REPONAME/envvar")

# Check for errors in the response
if echo "$response" | jq -e '.message' >/dev/null; then
  echo "Failed to acquire lock: $(echo "$response" | jq -r '.message')"
  exit 1
fi

echo "Lock acquired for environment: $env_name"
