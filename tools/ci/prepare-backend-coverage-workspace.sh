#!/bin/bash
set -euo pipefail

target_dir="coverage-workspace/node-${CIRCLE_NODE_INDEX}"
mkdir -p "${target_dir}"

if [[ ! -f ./coverage-expected ]]; then
  echo "Coverage not expected on this node; skipping copy."
  exit 0
fi

if [[ -f ./coverage/coverage-final.json ]]; then
  cp ./coverage/coverage-final.json "${target_dir}/coverage-final.json"
else
  echo "coverage/coverage-final.json not found; failing"
  exit 1
fi
