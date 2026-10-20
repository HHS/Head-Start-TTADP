#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")/../.."

node_index="${CIRCLE_NODE_INDEX:-0}"
node_total="${CIRCLE_NODE_TOTAL:-1}"
coverage_file="frontend/coverage/coverage-final.json"
workspace_dir="frontend-coverage-workspace/node-${node_index}"
selected_tests_file="frontend/coverage/selected-tests-${node_index}.txt"
selected_count_file="frontend/coverage/selected-test-count.txt"

prepare_coverage_workspace() {
  mkdir -p "${workspace_dir}"

  echo "Preparing frontend coverage workspace for node ${node_index}/${node_total}."
  echo "Coverage source: ${coverage_file}"
  echo "Coverage target: ${workspace_dir}/coverage-final.json"

  if [[ -f "${selected_count_file}" ]]; then
    echo "Selected frontend test count for this node: $(cat "${selected_count_file}")"
  else
    echo "Selected frontend test count file not found: ${selected_count_file}"
  fi

  if [[ -f "${selected_tests_file}" ]]; then
    echo "First selected frontend test files:"
    sed -n '1,20p' "${selected_tests_file}"
    cp "${selected_tests_file}" "${workspace_dir}/selected-tests.txt"
  else
    echo "Selected frontend test list not found: ${selected_tests_file}"
  fi

  [[ -f "${selected_count_file}" ]] && cp "${selected_count_file}" "${workspace_dir}/selected-test-count.txt"

  if [[ -f "${coverage_file}" ]]; then
    cp "${coverage_file}" "${workspace_dir}/coverage-final.json"
    cp "${coverage_file}" "${workspace_dir}/coverage-final-node-${node_index}.json"
    echo "Frontend coverage file copied successfully."
  else
    echo "Frontend coverage file not found: ${coverage_file}"
    echo "Debug: frontend/coverage contents:"
    find frontend/coverage -maxdepth 3 -type f -print 2>/dev/null | sort || true
    echo "Debug: frontend/reports contents:"
    find frontend/reports -maxdepth 3 -type f -print 2>/dev/null | sort || true
    return 1
  fi
}

export TZ=America/New_York
export CI=true
export JEST_JUNIT_OUTPUT_DIR=reports
export JEST_JUNIT_OUTPUT_NAME="unit-${node_index}.xml"
export JEST_JUNIT_ADD_FILE_ATTRIBUTE=1

cd frontend

echo "Listing frontend Jest tests for node ${node_index}/${node_total}."

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
split_tests_file="coverage/selected-tests-${node_index}.txt"

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

selected_count="$(wc -l < "${split_tests_file}" | tr -d ' ')"
printf "%d\n" "${selected_count}" > "coverage/selected-test-count.txt"

if [[ "${selected_count}" -eq 0 ]]; then
  echo "No frontend tests selected for this node."
  echo "{}" > coverage/coverage-final.json
  cd ..
  prepare_coverage_workspace
  exit 0
fi

selected_tests=()
while IFS= read -r test_file; do
  selected_tests+=("${test_file}")
done < "${split_tests_file}"

printf "Running %d frontend Jest files on node %s/%s\n" \
  "${selected_count}" \
  "${node_index}" \
  "${node_total}"

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
  --maxWorkers=50% || test_exit=$?
test_exit="${test_exit:-0}"

cd ..
if ! prepare_coverage_workspace; then
  exit 1
fi

exit "${test_exit}"
