#!/bin/bash

# Convert environment to app name if necessary
APP_NAME=$( [ "$1" == "DEV" ] && echo "tta-smarthub-dev" || echo "$1" )
BRANCH=$2
BUILD_ID=$3
JOB_NAME=${CIRCLE_JOB}  # Automatically use the current CircleCI job name

# Fetch environment variables
LOCK_DATA=$(cf env "$APP_NAME" | grep -A 10 LOCK_APP | sed ':a;N;$!ba;s/\n/ /g' | grep -oP "[{][^}]+[}]")

# Check if lock exists
if [ -z "$LOCK_DATA" ]; then
  echo "App $APP_NAME is not locked."
  exit 0
fi

# Extract lock metadata
LOCK_BRANCH=$(echo "$LOCK_DATA" | jq -r '.branch')
LOCK_BUILD_ID=$(echo "$LOCK_DATA" | jq -r '.build_id')
LOCK_JOB_NAME=$(echo "$LOCK_DATA" | jq -r '.job_name')

# Validate ownership
if [ "$LOCK_BRANCH" != "$BRANCH" ] || [ "$LOCK_BUILD_ID" != "$BUILD_ID" ] || [ "$LOCK_JOB_NAME" != "$JOB_NAME" ]; then
  echo "Cannot release lock: the app is locked by branch $LOCK_BRANCH with build ID $LOCK_BUILD_ID and job name $LOCK_JOB_NAME."
  exit 1
fi

# Release lock
cf unset-env "$APP_NAME" LOCK_APP

# Validate lock release
LOCK_DATA=$(cf env "$APP_NAME" | grep -A 10 LOCK_APP | sed ':a;N;$!ba;s/\n/ /g' | grep -oP "[{][^}]+[}]")

if [ -z "$LOCK_DATA" ]; then
  echo "Lock successfully released for app $APP_NAME."
  exit 0
else
  echo "Failed to release lock for app $APP_NAME."
  exit 1
fi
