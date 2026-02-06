#!/bin/bash
set -euo pipefail

temp_dir="coverage-temp"
report_dir="coverage-report"
mkdir -p "${temp_dir}"

coverage_count=0
while IFS= read -r -d $'\0' file; do
  relative_path="${file#./}"
  new_name="${relative_path//\//-}"
  new_path="${temp_dir}/${new_name}"
  cp "$file" "${new_path}"
  coverage_count=$((coverage_count + 1))
done < <(find . -name "coverage-final.json" -print0)

if [[ "${coverage_count}" -eq 0 ]]; then
  echo "No coverage-final.json files found; failing."
  exit 1
fi

npx nyc merge "${temp_dir}" "${temp_dir}/merged-coverage.json"
npx nyc report --temp-dir "${temp_dir}" --report-dir "${report_dir}" --reporter=html --reporter=json-summary
echo "Coverage report: https://output.circle-artifacts.com/output/job/${CIRCLE_WORKFLOW_JOB_ID}/artifacts/${CIRCLE_NODE_INDEX}/${report_dir}/index.html"
