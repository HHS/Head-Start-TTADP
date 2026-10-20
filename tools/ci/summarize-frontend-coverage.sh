#!/bin/bash
set -euo pipefail

coverage_file="${1:-./frontend/coverage/coverage-final.json}"
threshold="${2:-90}"

if [[ ! -f "${coverage_file}" ]]; then
  echo "Frontend coverage file not found: ${coverage_file}. Failing."
  exit 1
fi

node ./tools/summarize-coverageCLI.js "${coverage_file}" "${threshold}"
