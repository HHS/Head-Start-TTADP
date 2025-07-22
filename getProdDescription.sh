#!/bin/bash

# --- Configuration ---
# Replace with your repository owner and name
OWNER="HHS"
REPO="Head-Start-TTADP"

# Check if a PR number was provided as an argument
if [ -z "$1" ]; then
  echo "Usage: $0 <PR_NUMBER>"
  echo "Example: $0 123"
  exit 1
fi

PR_NUMBER="$1" # Assign the first argument to PR_NUMBER

if [ -z "$OWNER" ] || [ -z "$REPO" ]; then
  echo "Please configure OWNER and REPO at the top of the script."
  exit 1
fi

echo "Fetching commit SHAs for PR #$PR_NUMBER in $OWNER/$REPO..."

# Get all commit SHAs for the given PR
COMMIT_SHAS=$(gh pr view "$PR_NUMBER" --repo "$OWNER/$REPO" --json commits --jq '.commits[].oid')

if [ -z "$COMMIT_SHAS" ]; then
  echo "No commits found for PR #$PR_NUMBER or PR does not exist."
  exit 0
fi

echo "Found commits. Parsing for merge commits..."

MERGED_PR_TITLES=()
FOUND_TITLES=0

# Loop through each commit SHA
for SHA in $COMMIT_SHAS; do
  # Get the commit message for the current SHA
  COMMIT_MESSAGE=$(gh api "/repos/$OWNER/$REPO/commits/$SHA" --jq '.commit.message')

  # Check if it's a merge commit message
  # The regex captures the PR number after "Merge pull request #"
  if [[ "$COMMIT_MESSAGE" =~ ^Merge\ pull\ request\ \#([0-9]+)\ from\ .* ]]; then
    MERGED_PR_NUMBER="${BASH_REMATCH[1]}"

    # Get the title of the merged PR
    PR_TITLE=$(gh pr view "$MERGED_PR_NUMBER" --repo "$OWNER/$REPO" --json title --jq '.title' 2>/dev/null)

    if [ -n "$PR_TITLE" ]; then
      MERGED_PR_TITLES+=("$PR_TITLE")
      ((FOUND_TITLES++))
    else
      echo "  - Could not retrieve title for PR #$MERGED_PR_NUMBER (possibly private/deleted PR or API error)."
    fi
  fi
done

if [ ${#MERGED_PR_TITLES[@]} -gt 0 ]; then
  echo -e "\n#Description of change\n"
  printf "%s\n" "${MERGED_PR_TITLES[@]}"
  echo -e "\n\n#How to test"
  echo -e "\n_Add testing instructions here_"
  echo -e "\n\n#Issues(s)\n"
  for ((i = 1; i <= $FOUND_TITLES; i++)); do
    echo -e "* https://jira.acf.gov/browse/TTAHUB-"
  done
else
  echo "\nNo merge commits with identifiable PR numbers found in this PR's history."
fi
