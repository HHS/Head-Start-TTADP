#!/bin/bash

# This script runs zap against the frontend. See https://www.zaproxy.org/ for
# more info. This script expects to be called from the makefile at the root
# of the frontend, which sets the env variables used in this script. Any warn
# or error will cause this script to exit with a non-zero return

function cleanup {
    docker kill $ZAP_CONTAINER_NAME
    docker network rm $ZAP_NETWORK
}

trap cleanup EXIT
mkdir -p reports
make build
docker network create $ZAP_NETWORK

docker run -u $U_ID:$G_ID \
    -p 5000:5000 \
    -v $PWD:/app \
    --rm -d \
    --name $ZAP_CONTAINER_NAME \
    --network $ZAP_NETWORK \
    $DOCKER_TAG /bin/bash -c "serve -s build"

docker run -u $U_ID:$G_ID \
    -v $PWD/reports:/zap/wrk:rw \
    --rm \
    --network $ZAP_NETWORK \
    -t owasp/zap2docker-stable zap-baseline.py -j -t http://$ZAP_CONTAINER_NAME:5000 -r zap.html
