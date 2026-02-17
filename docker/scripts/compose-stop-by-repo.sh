#!/usr/bin/env bash

set -euo pipefail

project_label="${TTA_DOCKER_LABEL:-com.ttahub.project=head-start-ttadp}"

containers="$(
  {
    docker ps -aq --filter "label=${project_label}"
    docker ps -aq --filter "label=com.docker.compose.project=head-start-ttadp"
    docker ps -aq --filter "label=com.docker.compose.project=ttahub-dev"
    docker ps -aq --filter "label=com.docker.compose.project=ttahub-test"
    docker ps -aq --filter "name=postgres_docker"
    docker ps -aq --filter "name=test-db"
    docker ps -aq --filter "name=test-backend"
    docker ps -aq --filter "name=test-frontend"
  } | sort -u
)"
if [ -n "$containers" ]; then
  docker rm -f $containers >/dev/null
fi

networks="$(
  {
    docker network ls -q --filter "label=${project_label}"
    docker network ls -q --filter "label=com.docker.compose.project=head-start-ttadp"
    docker network ls -q --filter "label=com.docker.compose.project=ttahub-dev"
    docker network ls -q --filter "label=com.docker.compose.project=ttahub-test"
    docker network ls -q --filter "name=head-start-ttadp"
    docker network ls -q --filter "name=ttadp-test"
  } | sort -u
)"
if [ -n "$networks" ]; then
  docker network rm $networks >/dev/null 2>&1 || true
fi
