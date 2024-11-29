#!/bin/bash
# Usage: ./acquire-lock.sh <env_name>
set -euo pipefail

env_name=$1
lock_branch="deployment-locks"
lock_path="automation/locks"
lock_file="${lock_path}/${env_name}.lock"
current_time=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
current_epoch=$(date -u +"%s")
current_build_id=${CIRCLE_WORKFLOW_ID:-"UNKNOWN_WORKFLOW_ID"}
current_branch=${CIRCLE_BRANCH:-"UNKNOWN_BRANCH"}
current_commit=${CIRCLE_SHA1:-"UNKNOWN_COMMIT"}
lock_ttl=$((4 * 60 * 60)) # 4 hours in seconds

# Configure sparse checkout for the lock branch
git init locks
cd locks
git remote add origin <your-repo-url>
git fetch origin "$lock_branch"
git sparse-checkout init --cone
git sparse-checkout set "$lock_file"
git checkout "$lock_branch"

# Check if the lock file exists and is valid
if [ -f "$lock_file" ]; then
  lock_timestamp=$(jq -r '.timestamp' "$lock_file" || echo "")
  lock_epoch=$(date -u -d "$lock_timestamp" +"%s" 2>/dev/null || echo "0")
  lock_build_id=$(jq -r '.build_id' "$lock_file" || echo "")

  # Check if the lock is still valid
  if [ $((current_epoch - lock_epoch)) -lt $lock_ttl ]; then
    echo "Lock already exists for $env_name. Lock details:"
    cat "$lock_file"
    exit 1
  else
    echo "Existing lock for $env_name is invalid. Overwriting..."
  fi
fi

# Create the lock file
mkdir -p "$lock_path"  # Ensure the directory exists
cat > "$lock_file" <<EOF
{
  "branch": "$current_branch",
  "commit": "$current_commit",
  "build_id": "$current_build_id",
  "timestamp": "$current_time"
}
EOF

# Commit and push the lock file
git add "$lock_file"
git commit -m "Lock $env_name acquired by build $current_build_id"
if ! git push origin "$lock_branch"; then
  echo "Failed to push lock due to a race condition. Retrying..."
  exec "$0" "$env_name" # Retry the script
fi

echo "Lock acquired for $env_name."
