#!/bin/bash
# Usage: ./release-lock.sh <env_name>
set -euo pipefail

env_name=$1
lock_branch="deployment-locks"
lock_path="automation/locks"
lock_file="${lock_path}/${env_name}.lock"
current_epoch=$(date -u +"%s")
lock_ttl=$((4 * 60 * 60)) # 4 hours in seconds
current_build_id=${CIRCLE_WORKFLOW_ID:-"UNKNOWN_WORKFLOW_ID"}

# Configure sparse checkout for the lock branch
git init locks
cd locks
git remote add origin <your-repo-url>
git fetch origin "$lock_branch"
git sparse-checkout init --cone
git sparse-checkout set "$lock_file"
git checkout "$lock_branch"

# Check if the lock file exists
if [ ! -f "$lock_file" ]; then
  echo "No lock exists for $env_name. Nothing to release."
  exit 0
fi

lock_timestamp=$(jq -r '.timestamp' "$lock_file" || echo "")
lock_epoch=$(date -u -d "$lock_timestamp" +"%s" 2>/dev/null || echo "0")
lock_build_id=$(jq -r '.build_id' "$lock_file" || echo "")

# Remove the lock if it's invalid or belongs to the current build
if [ $((current_epoch - lock_epoch)) -ge $lock_ttl ] || [ "$lock_build_id" == "$current_build_id" ]; then
  rm "$lock_file"
  git add "$lock_file"
  git commit -m "Lock $env_name released"
  if ! git push origin "$lock_branch"; then
    echo "Failed to push lock removal due to a race condition. Retrying..."
    exec "$0" "$env_name" # Retry the script
  fi
  echo "Lock released for $env_name."
else
  echo "Cannot release lock. It is either valid or belongs to another build."
  exit 1
fi
