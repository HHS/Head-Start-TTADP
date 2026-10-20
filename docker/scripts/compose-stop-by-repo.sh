#!/usr/bin/env bash

set -euo pipefail

project_label="${TTA_DOCKER_LABEL:-com.ttahub.project=head-start-ttadp}"

docker ps | sed '1d'
containers="$(
  docker ps -aq --filter "label=${project_label}" | sort -u
)"
if [ -n "$containers" ]; then
  docker rm -f $containers >/dev/null
fi

networks="$(
  docker network ls -q --filter "label=${project_label}" | sort -u
)"
if [ -n "$networks" ]; then
  docker network rm $networks >/dev/null 2>&1 || true
fi
