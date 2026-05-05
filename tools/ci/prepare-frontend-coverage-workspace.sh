#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")/../.."

node_index="${CIRCLE_NODE_INDEX:-0}"
node_total="${CIRCLE_NODE_TOTAL:-1}"
target_dir="frontend-coverage-workspace/node-${node_index}"
mkdir -p "${target_dir}"

coverage_file="frontend/coverage/coverage-final.json"
selected_count_file="frontend/coverage/selected-test-count.txt"
selected_tests_file="frontend/coverage/selected-tests-${node_index}.txt"

echo "Preparing frontend coverage workspace for node ${node_index}/${node_total}."
echo "Working directory: $(pwd)"
echo "Coverage source: ${coverage_file}"
echo "Coverage target: ${target_dir}/coverage-final.json"

if [[ -f "${selected_count_file}" ]]; then
  selected_count="$(cat "${selected_count_file}")"
  echo "Selected frontend test count for this node: ${selected_count}"
else
  selected_count="unknown"
  echo "Selected frontend test count file not found: ${selected_count_file}"
fi

if [[ -f "${selected_tests_file}" ]]; then
  echo "First selected frontend test files:"
  sed -n '1,20p' "${selected_tests_file}"
else
  echo "Selected frontend test list not found: ${selected_tests_file}"
fi

if [[ -f "${coverage_file}" ]]; then
  cp "${coverage_file}" "${target_dir}/coverage-final.json"
  cp "${coverage_file}" "${target_dir}/coverage-final-node-${node_index}.json"
  [[ -f "${selected_count_file}" ]] && cp "${selected_count_file}" "${target_dir}/selected-test-count.txt"
  [[ -f "${selected_tests_file}" ]] && cp "${selected_tests_file}" "${target_dir}/selected-tests.txt"
  echo "Frontend coverage file copied successfully."
else
  echo "Frontend coverage file not found: ${coverage_file}"
  echo "Debug: frontend/coverage contents:"
  find frontend/coverage -maxdepth 3 -type f -print 2>/dev/null | sort || true
  echo "Debug: frontend/reports contents:"
  find frontend/reports -maxdepth 3 -type f -print 2>/dev/null | sort || true
  echo "Debug: recent frontend test-related files:"
  find frontend -maxdepth 3 \
    \( -path 'frontend/node_modules' -o -path 'frontend/build' \) -prune \
    -o -type f \
    \( -name '*coverage*' -o -name '*.xml' -o -name '*selected-tests*' \) \
    -print 2>/dev/null | sort | sed -n '1,100p' || true
  exit 1
fi
