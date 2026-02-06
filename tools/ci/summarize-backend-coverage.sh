#!/bin/bash
set -euo pipefail

coverage_file="${1:-./coverage/coverage-final.json}"
threshold="${2:-90}"

if [[ ! -f "${coverage_file}" ]]; then
  echo "Coverage file not found: ${coverage_file}. Failing."
  exit 1
fi

chmod +x ./tools/summarize-coverageCLI.js
node ./tools/summarize-coverageCLI.js "${coverage_file}" "${threshold}"
