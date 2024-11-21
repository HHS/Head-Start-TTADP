#!/bin/bash
# Usage: ./release-lock.sh <env_name>
set -e

env_name=$1
lock_key="LOCK_${env_name^^}"

# Check the current lock value
current_lock=$(./automation/ci/scripts/check-lock.sh "$env_name")

if [ "$current_lock" == "null" ]; then
  echo "No lock exists for environment: $env_name."
  exit 0
fi

existing_build_id=$(echo "$current_lock" | jq -r '.build_id')

# Ensure the lock is held by the current workflow
if [ "$existing_build_id" != "$CIRCLE_WORKFLOW_ID" ]; then
  echo "Cannot release lock. It is held by another workflow (Build ID: $existing_build_id)."
  exit 1
fi

# Delete the lock
curl -s -u "${CIRCLE_API_USER_TOKEN}:" \
  -X DELETE \
  "https://circleci.com/api/v2/project/gh/$CIRCLE_PROJECT_USERNAME/$CIRCLE_PROJECT_REPONAME/envvar/$lock_key"
echo "Lock released for environment: $env_name"
