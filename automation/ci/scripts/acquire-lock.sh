#!/bin/bash

# Convert environment to app name if necessary
APP_NAME=$( [ "$1" == "DEV" ] && echo "tta-smarthub-dev" || echo "$1" )
BRANCH=$2
BUILD_ID=$3
JOB_NAME=$4

# Constants
LOCK_TIMEOUT=7200  # 2 hours in seconds

# Fetch environment variables
LOCK_DATA=$(cf env "$APP_NAME" | grep -A 10 LOCK_APP | sed ':a;N;$!ba;s/\n/ /g' | grep -oP "[{][^}]+[}]")

# Check if lock exists
if [ -n "$LOCK_DATA" ]; then
  LOCK_TIMESTAMP=$(echo "$LOCK_DATA" | jq -r '.timestamp')
  LOCK_BRANCH=$(echo "$LOCK_DATA" | jq -r '.branch')
  LOCK_BUILD_ID=$(echo "$LOCK_DATA" | jq -r '.build_id')
  LOCK_JOB_NAME=$(echo "$LOCK_DATA" | jq -r '.job_name')

  CURRENT_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  TIME_DIFF=$(($(date -d "$CURRENT_TIME" +%s) - $(date -d "$LOCK_TIMESTAMP" +%s)))

  if [ $TIME_DIFF -lt $LOCK_TIMEOUT ]; then
    if [ "$LOCK_BRANCH" == "$BRANCH" ] && [ "$BUILD_ID" -gt "$LOCK_BUILD_ID" ] && [ "$LOCK_JOB_NAME" == "$JOB_NAME" ]; then
      echo "Lock is being usurped due to a newer build ID and matching job name."
    else
      echo "App $APP_NAME is locked by branch $LOCK_BRANCH, build ID $LOCK_BUILD_ID, job name $LOCK_JOB_NAME."
      exit 1
    fi
  else
    echo "Lock is stale. Attempting to acquire lock..."
  fi
fi

# Check if app is restaging
APP_STATE=$(cf apps | grep "$APP_NAME" | awk '{print $2}')
if [ "$APP_STATE" != "started" ] && [ "$APP_STATE" != "stopped" ]; then
  echo "App $APP_NAME is currently $APP_STATE. Cannot acquire lock."
  exit 1
fi

# Acquire lock
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
LOCK_DATA_JSON=$(jq -n \
  --arg branch "$BRANCH" \
  --arg build_id "$BUILD_ID" \
  --arg job_name "$JOB_NAME" \
  --arg timestamp "$TIMESTAMP" \
  '{branch: $branch, build_id: $build_id, job_name: $job_name, timestamp: $timestamp}')

cf set-env "$APP_NAME" LOCK_APP "$LOCK_DATA_JSON"

# Validate the lock
LOCK_DATA=$(cf env "$APP_NAME" | grep -A 10 LOCK_APP | sed ':a;N;$!ba;s/\n/ /g' | grep -oP "[{][^}]+[}]")
VALID_BRANCH=$(echo "$LOCK_DATA" | jq -r '.branch')
VALID_BUILD_ID=$(echo "$LOCK_DATA" | jq -r '.build_id')
VALID_JOB_NAME=$(echo "$LOCK_DATA" | jq -r '.job_name')

if [ "$VALID_BRANCH" == "$BRANCH" ] && [ "$VALID_BUILD_ID" == "$BUILD_ID" ] && [ "$VALID_JOB_NAME" == "$JOB_NAME" ]; then
  echo "Lock successfully acquired for app $APP_NAME."
  exit 0
else
  echo "Failed to acquire lock for app $APP_NAME."
  exit 1
fi
