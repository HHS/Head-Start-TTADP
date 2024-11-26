#!/bin/bash
# Usage: ./acquire-lock.sh <env_name>
set -euo pipefail
set -x

# Ensure jq and base64 are installed
if ! command -v jq &> /dev/null || ! command -v base64 &> /dev/null; then
  echo "jq or base64 is not installed. Installing..."
  sudo apt-get update && sudo apt-get install -y jq coreutils
fi

env_name=$1
lock_key="LOCK_${env_name^^}"
current_time=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
current_build_id=${CIRCLE_WORKFLOW_ID:-"UNKNOWN_WORKFLOW_ID"}

# Check if a lock already exists and is valid
lock_status=$(./automation/ci/scripts/check-lock.sh "$env_name")
if [[ "$lock_status" != "false" ]]; then
  echo "Environment $env_name is already locked." >&2
  exit 1
fi

# Temp files for payloads
temp_lock_payload=$(mktemp)
temp_encoded_payload=$(mktemp)
temp_api_payload=$(mktemp)

# Create lock payload as JSON and write to a temp file
jq -n \
  --arg branch "$CIRCLE_BRANCH" \
  --arg build_id "$current_build_id" \
  --arg timestamp "$current_time" \
  '{branch: $branch, build_id: $build_id, timestamp: $timestamp}' > "$temp_lock_payload"

# Encode the JSON payload as Base64 and save to a temp file
base64 < "$temp_lock_payload" > "$temp_encoded_payload"

# Construct the API request payload
jq -n \
  --arg name "$lock_key" \
  --arg value "$(cat "$temp_encoded_payload")" \
  '{name: $name, value: $value}' > "$temp_api_payload"

# Send the request to set the environment variable
curl -s \
  -H "Circle-Token: ${AUTOMATION_USER_TOKEN}" \
  -X POST \
  -H "Content-Type: application/json" \
  -d @"$temp_api_payload" \
  "https://circleci.com/api/v2/project/gh/$CIRCLE_PROJECT_USERNAME/$CIRCLE_PROJECT_REPONAME/envvar"

# Cleanup temp files
rm -f "$temp_lock_payload" "$temp_encoded_payload" "$temp_api_payload"

# Validate the lock was successfully set
lock_status=$(./automation/ci/scripts/check-lock.sh "$env_name")
if [[ "$lock_status" != "true" ]]; then
  echo "Failed to acquire lock for environment: $env_name." >&2
  exit 1
fi

echo "Lock acquired for environment: $env_name."
