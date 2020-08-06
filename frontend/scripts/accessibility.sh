#!/bin/bash

# This script runs pa11y-ci against the frontend. See
# https://github.com/pa11y/pa11y-ci for more info. This script expects to be
# called from the makefile at the root of the frontend, which sets the env
# variables used in this script.

function cleanup {
    make down-integration
}

trap cleanup EXIT
make up-integration

docker run -u $U_ID:$G_ID \
  -v $PWD:/app \
  --rm \
  --network frontend-ttadp \
  $DOCKER_IMAGE pa11y-ci -c pa11y.json http://frontend-ttadp:5000