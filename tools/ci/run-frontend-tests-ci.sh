#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")/../.."

export TZ=America/New_York
export CI=true
export JEST_JUNIT_OUTPUT_DIR=reports
export JEST_JUNIT_OUTPUT_NAME="unit-${CIRCLE_NODE_INDEX:-0}.xml"
export JEST_JUNIT_ADD_FILE_ATTRIBUTE=1

cd frontend

test_files=()
while IFS= read -r test_file; do
  test_files+=("${test_file}")
done < <(node --expose-gc ./node_modules/jest/bin/jest.js --listTests)

if [[ "${#test_files[@]}" -eq 0 ]]; then
  echo "No frontend Jest test files found."
  exit 1
fi

printf "%s\n" "${test_files[@]}" | circleci tests run \
  --command="../tools/ci/run-frontend-jest-files.sh" \
  --split-by=timings \
  --timings-type=filename
