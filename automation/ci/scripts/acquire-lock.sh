#!/bin/bash

# Convert environment to app name if necessary
APP_NAME=$( [ "$1" == "DEV" ] && echo "tta-smarthub-dev" || ([ "$1" == "SANDBOX" ] && echo "tta-smarthub-sandbox") || echo "$1" )
BRANCH=$2
BUILD_ID=$3

# Constants
LOCK_TIMEOUT=7200  # 2 hours in seconds

# Function to wait for restaging to complete
wait_for_restaging() {
  echo "Waiting for app $APP_NAME to finish restaging..."
  while true; do
    APP_STATE=$(cf apps | grep "$APP_NAME" | awk '{print $2}')
    if [ "$APP_STATE" == "started" ]; then
      echo "App $APP_NAME is running."
      break
    else
      echo "App $APP_NAME is still $APP_STATE..."
      sleep 5
    fi
  done
}

# Fetch environment variables
LOCK_DATA=$(cf env "$APP_NAME" | grep -A 10 LOCK_APP | sed ':a;N;$!ba;s/\n/ /g' | grep -oP "[{][^}]+[}]")

# Check if lock exists
if [ -n "$LOCK_DATA" ]; then
  LOCK_TIMESTAMP=$(echo "$LOCK_DATA" | jq -r '.timestamp')
  LOCK_BRANCH=$(echo "$LOCK_DATA" | jq -r '.branch')
  LOCK_BUILD_ID=$(echo "$LOCK_DATA" | jq -r '.build_id')

  CURRENT_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  TIME_DIFF=$(($(date -d "$CURRENT_TIME" +%s) - $(date -d "$LOCK_TIMESTAMP" +%s)))

  if [ $TIME_DIFF -lt $LOCK_TIMEOUT ]; then
    echo "App $APP_NAME is locked by branch $LOCK_BRANCH with build ID $LOCK_BUILD_ID."
    exit 1
  fi

  echo "Lock is stale. Attempting to acquire lock..."
fi

# Check if app is restaging
APP_STATE=$(cf apps | grep "$APP_NAME" | awk '{print $2}')
if [ "$APP_STATE" != "started" ]; then
  echo "App $APP_NAME is currently $APP_STATE. Cannot acquire lock."
  exit 1
fi

# Acquire lock
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
LOCK_DATA_JSON=$(jq -n \
  --arg branch "$BRANCH" \
  --arg build_id "$BUILD_ID" \
  --arg timestamp "$TIMESTAMP" \
  '{branch: $branch, build_id: $build_id, timestamp: $timestamp}')

cf set-env "$APP_NAME" LOCK_APP "$LOCK_DATA_JSON"
# cf restage "$APP_NAME"

# # Wait for restaging to complete
# wait_for_restaging

# Validate the lock
LOCK_DATA=$(cf env "$APP_NAME" | grep -A 10 LOCK_APP | sed ':a;N;$!ba;s/\n/ /g' | grep -oP "[{][^}]+[}]")
VALID_BRANCH=$(echo "$LOCK_DATA" | jq -r '.branch')
VALID_BUILD_ID=$(echo "$LOCK_DATA" | jq -r '.build_id')

if [ "$VALID_BRANCH" == "$BRANCH" ] && [ "$VALID_BUILD_ID" == "$BUILD_ID" ]; then
  echo "Lock successfully acquired for app $APP_NAME."
  exit 0
else
  echo "Failed to acquire lock for app $APP_NAME."
  exit 1
fi
