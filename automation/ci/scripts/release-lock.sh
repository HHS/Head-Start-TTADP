#!/bin/bash

# Convert environment to app name if necessary
APP_NAME=$( [ "$1" == "DEV" ] && echo "tta-smarthub-dev" || ([ "$1" == "SANDBOX" ] && echo "tta-smarthub-sandbox") || echo "$1" )
BRANCH=$2
BUILD_ID=$3

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
CF_ENV=$(cf env "$APP_NAME")
LOCK_DATA=$(echo "$CF_ENV" | grep 'LOCK_APP' | awk '{print $2}' | tr -d '"')

# Check if lock exists
if [ -z "$LOCK_DATA" ]; then
  echo "App $APP_NAME is not locked."
  exit 0
fi

# Extract lock metadata
LOCK_BRANCH=$(echo "$LOCK_DATA" | jq -r '.branch')
LOCK_BUILD_ID=$(echo "$LOCK_DATA" | jq -r '.build_id')

# Validate ownership
if [ "$LOCK_BRANCH" != "$BRANCH" ] || [ "$LOCK_BUILD_ID" != "$BUILD_ID" ]; then
  echo "Cannot release lock: the app is locked by branch $LOCK_BRANCH with build ID $LOCK_BUILD_ID."
  exit 1
fi

# Release lock
cf unset-env "$APP_NAME" LOCK_APP
cf restage "$APP_NAME"

# Wait for restaging to complete
wait_for_restaging

# Validate lock release
CF_ENV=$(cf env "$APP_NAME")
LOCK_DATA=$(echo "$CF_ENV" | grep 'LOCK_APP' | awk '{print $2}' | tr -d '"')

if [ -z "$LOCK_DATA" ]; then
  echo "Lock successfully released for app $APP_NAME."
  exit 0
else
  echo "Failed to release lock for app $APP_NAME."
  exit 1
fi
