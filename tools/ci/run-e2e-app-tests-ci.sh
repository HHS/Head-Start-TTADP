#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")/../.."

node_index="${CIRCLE_NODE_INDEX:-0}"
node_total="${CIRCLE_NODE_TOTAL:-1}"

# Spec files relative to tests/e2e, which is the classname Playwright's junit reporter records,
# so CircleCI can balance nodes with per-file timings from earlier runs.
spec_files=()
while IFS= read -r spec_file; do
  spec_files+=("${spec_file}")
done < <(cd tests/e2e && find . -name '*.spec.ts' | sed 's#^\./##' | sort)

if [[ "${#spec_files[@]}" -eq 0 ]]; then
  echo "No Playwright spec files found in tests/e2e."
  exit 1
fi

selected_specs=()
if [[ "${node_total}" -gt 1 ]] && command -v circleci >/dev/null 2>&1; then
  while IFS= read -r spec_file; do
    selected_specs+=("${spec_file}")
  done < <(printf "%s\n" "${spec_files[@]}" | circleci tests split \
    --split-by=timings \
    --timings-type=classname \
    --time-default=30s)
else
  selected_specs=("${spec_files[@]}")
fi

echo "Running ${#selected_specs[@]} of ${#spec_files[@]} Playwright spec files on node ${node_index}/${node_total}:"
printf "  %s\n" "${selected_specs[@]}"

if [[ "${#selected_specs[@]}" -eq 0 ]]; then
  echo "No Playwright spec files selected for this node."
  exit 0
fi

# Playwright treats file arguments as regular expressions matched against the full path, so
# anchor each one to keep activity-report.spec.ts from also matching activity-reports.spec.ts.
filters=()
for spec_file in "${selected_specs[@]}"; do
  filters+=("/${spec_file//./\\.}\$")
done

yarn test:e2e "${filters[@]}"
