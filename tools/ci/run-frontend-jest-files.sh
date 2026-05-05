#!/bin/bash
set -euo pipefail

selected_tests=()
while IFS= read -r test_file; do
  selected_tests+=("${test_file}")
done

if [[ "${#selected_tests[@]}" -eq 0 ]]; then
  echo "No frontend tests selected for this node."
  exit 0
fi

printf "Running %d frontend Jest files on node %s/%s\n" \
  "${#selected_tests[@]}" \
  "${CIRCLE_NODE_INDEX:-0}" \
  "${CIRCLE_NODE_TOTAL:-1}"

node \
  --expose-gc \
  ./node_modules/jest/bin/jest.js \
  "${selected_tests[@]}" \
  --coverage \
  --coverageThreshold='{}' \
  --silent \
  --reporters=default \
  --detectOpenHandles \
  --forceExit \
  --reporters=jest-junit \
  --logHeapUsage \
  --maxWorkers=50%
