#!/bin/bash
# Usage: ./release-lock.sh <env_name>
set -euo pipefail

env_name=$1
lock_branch="deployment-locks"
lock_path="automation/locks"
lock_file="${lock_path}/${env_name}.lock"
current_build_id=${CIRCLE_WORKFLOW_ID:-"UNKNOWN_WORKFLOW_ID"}

# Initialize the repository if not already initialized
if [ ! -d "./locks/.git" ]; then
  mkdir -p locks
  cd locks
  git init
  git remote add origin "<your-repo-url>"
  git fetch origin "$lock_branch"
  git checkout -b "$lock_branch" || git checkout "$lock_branch"
  cd ..
else
  cd locks
  git reset --hard
  git fetch origin "$lock_branch"
  git checkout "$lock_branch"
  cd ..
fi

# Check if the lock file exists and remove it if valid
if [ ! -f "locks/$lock_file" ]; then
  echo "No lock exists for $env_name. Nothing to release."
  exit 0
fi

lock_build_id=$(jq -r '.build_id' "locks/$lock_file" || echo "")

if [ "$lock_build_id" == "$current_build_id" ]; then
  rm "locks/$lock_file"
  cd locks
  git add "$lock_file"
  git commit -m "Lock $env_name released by build $current_build_id"
  if ! git push origin "$lock_branch"; then
    echo "Failed to push lock removal due to a race condition. Retrying..."
    exec "$0" "$env_name"
  fi
  echo "Lock released for $env_name."
else
  echo "Cannot release lock. It is held by another build."
  exit 1
fi
