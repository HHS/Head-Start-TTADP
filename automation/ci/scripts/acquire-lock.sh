#!/bin/bash
# Usage: ./acquire-lock.sh <env_name>
set -euo pipefail

env_name=$1
lock_branch="deployment-locks"
lock_path="automation/locks"
lock_file="${lock_path}/${env_name}.lock"
current_time=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
current_build_id=${CIRCLE_WORKFLOW_ID:-"UNKNOWN_WORKFLOW_ID"}
current_branch=${CIRCLE_BRANCH:-"UNKNOWN_BRANCH"}
current_commit=${CIRCLE_SHA1:-"UNKNOWN_COMMIT"}

# Initialize the repository if not already initialized
if [ ! -d "./locks/.git" ]; then
  mkdir -p locks
  cd locks
  git init
  git remote add origin "https://github.com/HHS/Head-Start-TTADP/"
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

# Check if the lock file exists and create/update it
mkdir -p "locks/$lock_path"
if [ -f "locks/$lock_file" ]; then
  echo "Lock already exists for $env_name. Overwriting..."
fi

cat > "locks/$lock_file" <<EOF
{
  "branch": "$current_branch",
  "commit": "$current_commit",
  "build_id": "$current_build_id",
  "timestamp": "$current_time"
}
EOF

cd locks
git add "$lock_file"
git commit -m "Lock $env_name acquired by build $current_build_id"
if ! git push origin "$lock_branch"; then
  echo "Failed to push lock due to a race condition. Retrying..."
  exec "$0" "$env_name"
fi
echo "Lock acquired for $env_name."
