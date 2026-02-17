#!/usr/bin/env bash

set -euo pipefail

project_label="${TTA_DOCKER_LABEL:-com.ttahub.project=head-start-ttadp}"

volumes="$(
  {
    docker volume ls -q --filter "label=${project_label}"
    docker volume ls -q --filter "label=com.docker.compose.project=head-start-ttadp"
    docker volume ls -q --filter "label=com.docker.compose.project=ttahub-dev"
    docker volume ls -q --filter "label=com.docker.compose.project=ttahub-test"
    docker volume ls -q --filter "name=head-start-ttadp"
    docker volume ls -q --filter "name=ttahub-dev"
    docker volume ls -q --filter "name=ttahub-test"
  } | sort -u
)"
if [ -n "$volumes" ]; then
  docker volume rm -f $volumes >/dev/null
fi
