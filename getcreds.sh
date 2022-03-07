#!/bin/bash

# Run this script with a . in order to set environment variables in your shell
# For example:
#   . ./getcreds.sh

set -e

SERVICE_INSTANCE_NAME=ttahub-document-upload-dev
KEY_NAME=ttahub-document-upload-dev

cf create-service-key "${SERVICE_INSTANCE_NAME}" "${KEY_NAME}"
S3_CREDENTIALS=`cf service-key "${SERVICE_INSTANCE_NAME}" "${KEY_NAME}" | tail -n +2`

export AWS_ACCESS_KEY_ID=`echo "${S3_CREDENTIALS}" | jq -r .credentials.access_key_id`
export AWS_SECRET_ACCESS_KEY=`echo "${S3_CREDENTIALS}" | jq -r .credentials.secret_access_key`
export BUCKET_NAME=`echo "${S3_CREDENTIALS}" | jq -r .credentials.bucket`
export AWS_DEFAULT_REGION=`echo "${S3_CREDENTIALS}" | jq -r '.credentials.region'`

echo "AWS_ACCESS_KEY_ID: ${AWS_ACCESS_KEY_ID}"
echo "AWS_SECRET_ACCESS_KEY: ${AWS_SECRET_ACCESS_KEY}"
echo "BUCKET_NAME: ${BUCKET_NAME}"
echo "AWS_DEFAULT_REGION: ${AWS_DEFAULT_REGION}"
