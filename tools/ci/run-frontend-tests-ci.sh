#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")/../.."

export TZ=America/New_York
export CI=true
export JEST_JUNIT_OUTPUT_DIR=reports
export JEST_JUNIT_OUTPUT_NAME="unit-${CIRCLE_NODE_INDEX:-0}.xml"
export JEST_JUNIT_ADD_FILE_ATTRIBUTE=1

cd frontend

echo "Listing frontend Jest tests for node ${CIRCLE_NODE_INDEX:-0}/${CIRCLE_NODE_TOTAL:-1}."

node_index="${CIRCLE_NODE_INDEX:-0}"
node_total="${CIRCLE_NODE_TOTAL:-1}"
mkdir -p coverage

test_files=()
while IFS= read -r test_file; do
  test_files+=("${test_file}")
done < <(node --expose-gc ./node_modules/jest/bin/jest.js --listTests)

if [[ "${#test_files[@]}" -eq 0 ]]; then
  echo "No frontend Jest test files found."
  exit 1
fi

echo "Found ${#test_files[@]} frontend Jest test files before CircleCI splitting."

all_tests_file="coverage/all-tests.txt"
split_tests_file="coverage/split-tests-${node_index}.txt"

printf "%s\n" "${test_files[@]}" > "${all_tests_file}"

printf "%s\n" "${test_files[@]}" | circleci tests split \
  --split-by=timings \
  --timings-type=filename \
  --time-default=10s > "${split_tests_file}"

split_count="$(wc -l < "${split_tests_file}" | tr -d ' ')"
echo "CircleCI selected ${split_count} frontend Jest files for node ${node_index}/${node_total}."

if [[ "${split_count}" -eq 0 && "${#test_files[@]}" -gt 0 ]]; then
  echo "CircleCI selected no frontend tests; falling back to deterministic round-robin split."
  awk -v idx="${node_index}" -v total="${node_total}" \
    'total <= 1 || ((NR - 1) % total) == idx { print }' \
    "${all_tests_file}" > "${split_tests_file}"
  split_count="$(wc -l < "${split_tests_file}" | tr -d ' ')"
  echo "Fallback selected ${split_count} frontend Jest files for node ${node_index}/${node_total}."
fi

echo "First frontend Jest files selected for this node:"
sed -n '1,20p' "${split_tests_file}"

../tools/ci/run-frontend-jest-files.sh < "${split_tests_file}"
