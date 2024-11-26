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
lock_status=$(./automation/ci/scripts/check-lock.sh "$env_name")

# If no valid lock exists, exit gracefully
if [[ "$lock_status" == "false" ]]; then
  echo "No valid lock exists for environment: $env_name. Nothing to release."
  exit 0
fi

# Parse the existing lock to verify ownership
temp_lock_file=$(mktemp)
./automation/ci/scripts/check-lock.sh "$env_name" > "$temp_lock_file"

lock_build_id=$(grep -oP '(?<="build_id": ")[^"]*' "$temp_lock_file")
rm -f "$temp_lock_file"

# Ensure the lock is held by the current workflow
if [ "$lock_build_id" != "${CIRCLE_WORKFLOW_ID:-UNKNOWN_WORKFLOW_ID}" ]; then
  echo "Cannot release lock. It is held by another workflow (Build ID: $lock_build_id)." >&2
  exit 1
fi

# Delete the lock
curl -s \
  -H "Circle-Token: ${AUTOMATION_USER_TOKEN}" \
  -X DELETE \
  "https://circleci.com/api/v2/project/gh/$CIRCLE_PROJECT_USERNAME/$CIRCLE_PROJECT_REPONAME/envvar/$lock_key"

# Validate the lock was successfully cleared
lock_status=$(./automation/ci/scripts/check-lock.sh "$env_name")
if [[ "$lock_status" != "false" ]]; then
  echo "Lock release validation failed for environment: $env_name." >&2
  exit 1
fi

echo "Lock released for environment: $env_name."
