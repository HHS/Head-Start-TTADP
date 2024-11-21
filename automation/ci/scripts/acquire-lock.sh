#!/bin/bash
# Usage: ./acquire-lock.sh <env_name>
set -e

env_name=$1
lock_key="LOCK_${env_name^^}"
current_time=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
current_build_id=$CIRCLE_WORKFLOW_ID

# Create lock payload
lock_payload=$(jq -n \
  --arg branch "$CIRCLE_BRANCH" \
  --arg build_id "$current_build_id" \
  --arg timestamp "$current_time" \
  '{branch: $branch, build_id: $build_id, timestamp: $timestamp}')

# Check the current lock value
current_lock=$(./automation/ci/scripts/check-lock.sh "$env_name")

if [ "$current_lock" != "null" ]; then
  existing_build_id=$(echo "$current_lock" | jq -r '.build_id')
  existing_timestamp=$(echo "$current_lock" | jq -r '.timestamp')

  # Check if the lock is stale
  lock_age=$(( $(date -u -d "$current_time" +%s) - $(date -u -d "$existing_timestamp" +%s) ))
  if [ "$lock_age" -le 3600 ] && [ "$existing_build_id" != "$current_build_id" ]; then
    echo "Environment $env_name is locked by another workflow (Build ID: $existing_build_id). Exiting."
    exit 1
  fi
fi

# Set the new lock
curl -s -u "${CIRCLE_API_USER_TOKEN}:" \
  -X POST \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"$lock_key\",\"value\":\"$lock_payload\"}" \
  "https://circleci.com/api/v2/project/gh/$CIRCLE_PROJECT_USERNAME/$CIRCLE_PROJECT_REPONAME/envvar"
echo "Lock acquired for environment: $env_name"
