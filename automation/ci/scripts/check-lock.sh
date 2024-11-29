#!/bin/bash
# Usage: ./check-lock.sh <env_name>
set -euo pipefail

env_name=$1
lock_branch="deployment-locks"
lock_path="automation/locks"
lock_file="${lock_path}/${env_name}.lock"
current_epoch=$(date -u +"%s")
lock_ttl=$((4 * 60 * 60)) # 4 hours in seconds

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
  echo "false"
  exit 0
fi

lock_timestamp=$(jq -r '.timestamp' "$lock_file" || echo "")
lock_epoch=$(date -u -d "$lock_timestamp" +"%s" 2>/dev/null || echo "0")
lock_build_id=$(jq -r '.build_id' "$lock_file" || echo "")

# Validate the lock
if [ $((current_epoch - lock_epoch)) -lt $lock_ttl ]; then
  echo "true"
else
  echo "false"
fi
