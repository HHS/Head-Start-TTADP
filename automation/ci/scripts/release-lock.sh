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

# If no valid lock exists, exit gracefully
if [[ "$current_lock" == "{}" ]]; then
  echo "No valid lock exists for environment: $env_name. Nothing to release."
  exit 0
fi

# Parse the existing lock to verify ownership
temp_lock_file=$(mktemp)
echo "$current_lock" > "$temp_lock_file"
existing_build_id=$(jq -r '.build_id // empty' < "$temp_lock_file")
rm -f "$temp_lock_file"

# Ensure the lock is held by the current workflow
if [ "$existing_build_id" != "${CIRCLE_WORKFLOW_ID:-UNKNOWN_WORKFLOW_ID}" ]; then
  echo "Cannot release lock. It is held by another workflow (Build ID: $existing_build_id)." >&2
  exit 1
fi

# Delete the lock
response=$(curl -s \
  -H "Circle-Token: ${AUTOMATION_USER_TOKEN}" \
  -X DELETE \
  "https://circleci.com/api/v2/project/gh/$CIRCLE_PROJECT_USERNAME/$CIRCLE_PROJECT_REPONAME/envvar/$lock_key")

# Check if the response contains an error
if echo "$response" | jq -e '.message' >/dev/null; then
  echo "Error deleting lock: $(echo "$response" | jq -r '.message')" >&2
  exit 1
fi

# Validate the lock was successfully cleared
final_check=$(./automation/ci/scripts/check-lock.sh "$env_name")
if [[ "$final_check" != "{}" ]]; then
  echo "Lock release validation failed: $final_check" >&2
  exit 1
fi

echo "Lock released for environment: $env_name."
