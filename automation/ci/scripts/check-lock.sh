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
response=$(curl -s \
  -H "Circle-Token: ${AUTOMATION_USER_TOKEN}" \
  -X GET \
  "https://circleci.com/api/v2/project/gh/$CIRCLE_PROJECT_USERNAME/$CIRCLE_PROJECT_REPONAME/envvar/$lock_key")

# Write response to a temp file
temp_response_file=$(mktemp)
echo "$response" > "$temp_response_file"

# Check for errors in the response
if jq -e '.message' < "$temp_response_file" >/dev/null; then
  echo "Error fetching lock: $(jq -r '.message' < "$temp_response_file")" >&2
  echo "{}"
  rm -f "$temp_response_file"
  exit 0
fi

lock_value=$(jq -r '.value // empty' < "$temp_response_file")
rm -f "$temp_response_file"

if [ -z "$lock_value" ]; then
  echo "{}"
  exit 0
fi

# Decode the Base64-encoded JSON string
if ! lock_value_decoded=$(echo "$lock_value" | base64 --decode 2>/dev/null); then
  echo "Error decoding Base64 lock value: $lock_value" >&2
  echo "{}"
  exit 0
fi

# Additional validation checks...
echo "$lock_value_decoded"
