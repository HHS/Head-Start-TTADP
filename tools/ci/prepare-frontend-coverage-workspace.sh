#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")/../.."

target_dir="frontend-coverage-workspace/node-${CIRCLE_NODE_INDEX:-0}"
mkdir -p "${target_dir}"

coverage_file="frontend/coverage/coverage-final.json"

if [[ -f "${coverage_file}" ]]; then
  cp "${coverage_file}" "${target_dir}/coverage-final.json"
else
  echo "${coverage_file} not found; failing"
  exit 1
fi
