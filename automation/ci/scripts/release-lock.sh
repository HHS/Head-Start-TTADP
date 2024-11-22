#!/bin/bash
# Usage: ./release-lock.sh <env_name>
set -euo pipefail
set -x

# Ensure jq and base64 are installed
if ! command -v jq &> /dev/null || ! command -v base64 &> /dev/null; then
  echo "jq or base64 is not installed. Installing..."
  sudo apt-get update && sudo apt-get install -y jq coreutils
fi

env_name=$1
lock_key="LOCK_${env_name^^}"

# Check the current lock value and validate its status
current_lock=$(./automation/ci/scripts/check-lock.sh "$env_name")

# Log the lock value for debugging
echo "Current lock value: $current_lock" >&2

# If no valid lock exists, exit gracefully
if [[ "$current_lock" == "{}" ]]; then
  echo "No valid lock exists for environment: $env_name. Nothing to release."
  exit 0
fi

# Parse the existing lock to verify ownership
existing_build_id=$(echo "$current_lock" | jq -r '.build_id // empty')

# Ensure the lock is held by the current workflow
if [ "$existing_build_id" != "$CIRCLE_WORKFLOW_ID" ]; then
  echo "Cannot release lock. It is held by another workflow (Build ID: $existing_build_id)." >&2
  exit 1
fi

# Delete the lock
response=$(curl -s -u "${AUTOMATION_USER_TOKEN}:" \
  -X DELETE \
  "https://circleci.com/api/v2/project/gh/$CIRCLE_PROJECT_USERNAME/$CIRCLE_PROJECT_REPONAME/envvar/$lock_key")

# Validate the lock was successfully cleared
final_check=$(./automation/ci/scripts/check-lock.sh "$env_name")
if [[ "$final_check" != "{}" ]]; then
  echo "Lock release validation failed: $final_check" >&2
  exit 1
fi

echo "Lock released for environment: $env_name."
