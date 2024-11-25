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
current_build_id=${CIRCLE_WORKFLOW_ID:-"UNKNOWN_WORKFLOW_ID"}
two_hours_in_seconds=$((2 * 60 * 60))
current_time=$(date -u +%s)

# Temp files for storing response and values
temp_response_file=$(mktemp)
temp_value_file=$(mktemp)
temp_decoded_file=$(mktemp)

# Fetch the lock value from CircleCI project environment variables
curl -s \
  -H "Circle-Token: ${AUTOMATION_USER_TOKEN}" \
  -X GET \
  "https://circleci.com/api/v2/project/gh/$CIRCLE_PROJECT_USERNAME/$CIRCLE_PROJECT_REPONAME/envvar/$lock_key" \
  -o "$temp_response_file"

# Check for errors in the response
if jq -e '.message' < "$temp_response_file" >/dev/null; then
  error_message=$(jq -r '.message' < "$temp_response_file")
  if [[ "$error_message" == "Environment variable not found." ]]; then
    # No active lock; return false
    echo "false"
    rm -f "$temp_response_file" "$temp_value_file" "$temp_decoded_file"
    exit 0
  else
    # Handle other errors
    echo "Error fetching lock: $error_message" >&2
    rm -f "$temp_response_file" "$temp_value_file" "$temp_decoded_file"
    exit 1
  fi
fi

# Extract the Base64-encoded value and save it to a temp file
jq -r '.value // empty' < "$temp_response_file" > "$temp_value_file"
rm -f "$temp_response_file"

# If the lock value is empty, there is no active lock
if [ ! -s "$temp_value_file" ]; then
  echo "false"
  rm -f "$temp_value_file" "$temp_decoded_file"
  exit 0
fi

# Check for obfuscation corruption using grep
if grep -q '^xxxxCg==$' "$temp_value_file"; then
  echo "Obfuscation corruption detected." >&2
  rm -f "$temp_value_file" "$temp_decoded_file"
  exit 1
fi

# Decode the Base64 value into another temp file
if ! base64 --decode -i "$temp_value_file" -o "$temp_decoded_file" 2>/dev/null; then
  echo "Error decoding Base64 lock value." >&2
  rm -f "$temp_value_file" "$temp_decoded_file"
  exit 1
fi

rm -f "$temp_value_file"

# Validate the JSON and extract the required fields
if ! grep -q '"timestamp":' "$temp_decoded_file" || ! grep -q '"build_id":' "$temp_decoded_file"; then
  echo "Lock is corrupted: Missing timestamp or build_id." >&2
  rm -f "$temp_decoded_file"
  exit 1
fi

lock_timestamp=$(grep -oP '(?<="timestamp": ")[^"]*' "$temp_decoded_file")
lock_build_id=$(grep -oP '(?<="build_id": ")[^"]*' "$temp_decoded_file")

# If the lock build ID matches the current build ID, the lock is valid
if [ "$lock_build_id" == "$current_build_id" ]; then
  echo "true"
  rm -f "$temp_decoded_file"
  exit 0
fi

# Convert lock timestamp to seconds since epoch
if ! lock_time_seconds=$(date -u -d "$lock_timestamp" +%s 2>/dev/null); then
  echo "Error converting timestamp to epoch seconds: $lock_timestamp" >&2
  rm -f "$temp_decoded_file"
  exit 1
fi

# Check if the lock is older than 2 hours
time_difference=$((current_time - lock_time_seconds))
if [ "$time_difference" -gt "$two_hours_in_seconds" ]; then
  # Delete the expired lock
  curl -s \
    -H "Circle-Token: ${AUTOMATION_USER_TOKEN}" \
    -X DELETE \
    "https://circleci.com/api/v2/project/gh/$CIRCLE_PROJECT_USERNAME/$CIRCLE_PROJECT_REPONAME/envvar/$lock_key" \
    >/dev/null
  echo "false"
  rm -f "$temp_decoded_file"
  exit 0
fi

# Check if the workflow corresponding to the build ID is active
workflow_response_file=$(mktemp)
curl -s \
  -H "Circle-Token: ${AUTOMATION_USER_TOKEN}" \
  -X GET \
  "https://circleci.com/api/v2/workflow/$lock_build_id" \
  -o "$workflow_response_file"

workflow_status=$(grep -oP '(?<="status": ")[^"]*' "$workflow_response_file")
rm -f "$workflow_response_file"

if [ "$workflow_status" != "running" ] && [ "$workflow_status" != "on_hold" ]; then
  # Delete the lock for a non-running workflow
  curl -s \
    -H "Circle-Token: ${AUTOMATION_USER_TOKEN}" \
    -X DELETE \
    "https://circleci.com/api/v2/project/gh/$CIRCLE_PROJECT_USERNAME/$CIRCLE_PROJECT_REPONAME/envvar/$lock_key" \
    >/dev/null
  echo "false"
  rm -f "$temp_decoded_file"
  exit 0
fi

# If the lock belongs to another workflow, return an error
echo "Lock is held by another workflow (Build ID: $lock_build_id)." >&2
rm -f "$temp_decoded_file"
exit 1
