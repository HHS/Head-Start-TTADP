#!/bin/bash
# Usage: skip-unless-changed.sh <backend|frontend|any> [--check]
#
# Ends the current CircleCI job early (reported as a success) when nothing this branch
# changes against origin/main can affect the job's tests:
#   frontend  frontend/, packages/, .circleci/ or tools/ci/ changed
#   backend   anything outside frontend/ changed
#   any       anything other than documentation changed
# Documentation is *.md files and docs/.
#
# Pull requests, main, production, the merge queue and tags always run everything, and so
# does anything unexpected (for example origin/main cannot be fetched): skipping is only an
# optimization for branch pushes that do not have a pull request yet.
#
# With --check nothing is halted; the exit status says whether the tests would run
# (0) or be skipped (1), for steps that depend on a skipped job's output.
set -uo pipefail

scope="${1:-}"
mode="${2:-}"

# "backend tests", "frontend tests", or just "tests" for the any scope
label="${scope} tests"
if [[ "${scope}" == "any" ]]; then
  label="tests"
fi

run_tests() {
  echo "Running ${label}: $1"
  exit 0
}

skip_tests() {
  echo "Skipping ${label}: none of this branch's changes against origin/main affect them."
  echo "Changed files:"
  printf '  %s\n' "${changed[@]}"
  if [[ "${mode}" == "--check" ]]; then
    exit 1
  fi
  circleci-agent step halt
  exit 0
}

case "${scope}" in
  backend | frontend | any) ;;
  *)
    echo "Usage: $0 <backend|frontend|any> [--check]" >&2
    exit 2
    ;;
esac

if [[ -n "${CIRCLE_PULL_REQUEST:-}" ]]; then
  run_tests "branch has an open pull request"
fi
if [[ -n "${CIRCLE_TAG:-}" ]]; then
  run_tests "tag build"
fi
case "${CIRCLE_BRANCH:-}" in
  "" | main | production | gh-readonly-queue/*)
    run_tests "branch '${CIRCLE_BRANCH:-unknown}' always runs everything"
    ;;
esac

git fetch --quiet origin main || run_tests "could not fetch origin/main"
base="$(git merge-base HEAD origin/main)" || run_tests "no merge base with origin/main"

changed=()
while IFS= read -r file; do
  changed+=("${file}")
done < <(git diff --name-only "${base}" HEAD)

if [[ "${#changed[@]}" -eq 0 ]]; then
  run_tests "no changes found against origin/main"
fi

for file in "${changed[@]}"; do
  # documentation never affects tests
  if [[ "${file}" == *.md || "${file}" == docs/* ]]; then
    continue
  fi
  case "${scope}" in
    any)
      run_tests "${file} changed"
      ;;
    frontend)
      case "${file}" in
        frontend/* | packages/* | .circleci/* | tools/ci/*) run_tests "${file} changed" ;;
      esac
      ;;
    backend)
      if [[ "${file}" != frontend/* ]]; then
        run_tests "${file} changed"
      fi
      ;;
  esac
done

skip_tests
