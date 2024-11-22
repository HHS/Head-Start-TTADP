#!/bin/bash
# Usage: ./check-lock.sh <env_name>
set -euo pipefail
set -x

# Ensure jq and base64 are installed
if ! command -v jq &> /dev/null || ! command -v base64 &> /dev/null; then
  echo "jq or base64 is not installed. Installing..."
  sudo apt-get update && sudo apt-get install -y jq coreutils
fi

env_name=$1
lock_key="LOCK_${env_name^^}"
two_hours_in_seconds=$((2 * 60 * 60))
current_time=$(date -u +%s)

# Fetch the lock value from CircleCI project environment variables
response=$(curl -s -u "${AUTOMATION_USER_TOKEN}:" \
  -X GET \
  "https://circleci.com/api/v2/project/gh/$CIRCLE_PROJECT_USERNAME/$CIRCLE_PROJECT_REPONAME/envvar/$lock_key")

# Check for errors in the response
if echo "$response" | jq -e '.message' >/dev/null; then
  echo "Error fetching lock: $(echo "$response" | jq -r '.message')" >&2
  echo "{}"
  exit 0
fi

lock_value=$(echo "$response" | jq -r '.value // empty')

if [ -z "$lock_value" ]; then
  echo "{}"
  exit 0
fi

# Decode the Base64-encoded JSON string
lock_value_decoded=$(echo "$lock_value" | base64 --decode | jq -rc)
echo "Current lock value: $lock_value_decoded" >&2

# Parse values from the lock
lock_build_id=$(echo "$lock_value_decoded" | jq -r '.build_id // empty')
lock_timestamp=$(echo "$lock_value_decoded" | jq -r '.timestamp // empty')

# Check if the lock has a valid build_id and timestamp
if [ -z "$lock_build_id" ] || [ -z "$lock_timestamp" ]; then
  echo "Invalid lock: Missing build_id or timestamp. Assuming no valid lock exists." >&2
  echo "{}"
  exit 0
fi

# Convert lock timestamp to seconds since epoch
lock_time_seconds=$(date -u -d "$lock_timestamp" +%s)

# Check if the lock is older than 2 hours
time_difference=$((current_time - lock_time_seconds))
if [ "$time_difference" -gt "$two_hours_in_seconds" ]; then
  echo "Lock is older than 2 hours. Invalidating lock." >&2
  echo "{}"
  exit 0
fi

# Check if the workflow corresponding to the build_id is active
workflow_response=$(curl -s -u "${AUTOMATION_USER_TOKEN}:" \
  -X GET \
  "https://circleci.com/api/v2/workflow/$lock_build_id")

workflow_status=$(echo "$workflow_response" | jq -r '.status // empty')

if [ "$workflow_status" != "running" ] && [ "$workflow_status" != "on_hold" ]; then
  echo "Lock build_id is not active on CircleCI (Status: $workflow_status). Invalidating lock." >&2
  echo "{}"
  exit 0
fi

# If all checks pass, the lock is valid
echo "$lock_value_decoded"
