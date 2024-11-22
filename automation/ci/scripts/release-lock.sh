#!/bin/bash
# Usage: ./release-lock.sh <env_name>
set -euo pipefail
set -x

# Ensure jq is installed
if ! command -v jq &> /dev/null; then
  echo "jq is not installed. Installing..."
  sudo apt-get update && sudo apt-get install -y jq
fi

env_name=$1
lock_key="LOCK_${env_name^^}"

# Check the current lock value
current_lock=$(./automation/ci/scripts/check-lock.sh "$env_name" || echo "{}")

# Log the lock value for debugging
echo "Current lock value: $current_lock"

# Validate JSON format and check if the lock exists
if ! echo "$current_lock" | jq -e . >/dev/null 2>&1; then
  echo "Invalid lock data for environment: $env_name. Assuming no lock exists."
  exit 0
fi

# Parse the existing lock value
existing_build_id=$(echo "$current_lock" | jq -r '.build_id // empty')

# Ensure the lock is held by the current workflow
if [ -z "$existing_build_id" ]; then
  echo "No lock exists for environment: $env_name."
  exit 0
fi

if [ "$existing_build_id" != "$CIRCLE_WORKFLOW_ID" ]; then
  echo "Cannot release lock. It is held by another workflow (Build ID: $existing_build_id)."
  exit 1
fi

# Delete the lock
response=$(curl -s -u "${AUTOMATION_USER_TOKEN}:" \
  -X DELETE \
  "https://circleci.com/api/v2/project/gh/$CIRCLE_PROJECT_USERNAME/$CIRCLE_PROJECT_REPONAME/envvar/$lock_key")

# Check for errors in the response
if echo "$response" | jq -e '.message' >/dev/null 2>&1; then
  echo "Failed to release lock: $(echo "$response" | jq -r '.message')"
  exit 1
fi

echo "Lock released for environment: $env_name."
