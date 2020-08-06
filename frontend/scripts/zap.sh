#!/bin/bash

# This script runs zap against the frontend. See https://www.zaproxy.org/ for
# more info. This script expects to be called from the makefile at the root
# of the frontend, which sets the env variables used in this script. Any warn
# or error will cause this script to exit with a non-zero return

function cleanup {
    make down-integration
}

trap cleanup EXIT
make up-integration

docker run -u $U_ID:$G_ID \
    -v $PWD/reports:/zap/wrk:rw \
    --rm \
    --network frontend-ttadp \
    -t owasp/zap2docker-stable zap-baseline.py -j -t http://frontend-ttadp:5000 -r zap.html
