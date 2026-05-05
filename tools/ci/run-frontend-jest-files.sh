#!/bin/bash
set -euo pipefail

mkdir -p coverage reports

selected_tests=()
while IFS= read -r test_file; do
  selected_tests+=("${test_file}")
done

selected_count="${#selected_tests[@]}"
selected_tests_file="coverage/selected-tests-${CIRCLE_NODE_INDEX:-0}.txt"

: > "${selected_tests_file}"
if [[ "${selected_count}" -gt 0 ]]; then
  printf "%s\n" "${selected_tests[@]}" > "${selected_tests_file}"
fi
printf "%d\n" "${selected_count}" > "coverage/selected-test-count.txt"

if [[ "${selected_count}" -eq 0 ]]; then
  echo "No frontend tests selected for this node."
  echo "{}" > coverage/coverage-final.json
  exit 0
fi

printf "Running %d frontend Jest files on node %s/%s\n" \
  "${selected_count}" \
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
