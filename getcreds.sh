#!/bin/bash

# Run this script with a . in order to set environment variables in your shell
# For example:
#   . ./getcreds.sh

set -e

SERVICE_INSTANCE_NAME_DEV=ttahub-document-upload-dev
SERVICE_INSTANCE_NAME_PROD=ttahub-document-upload-prod
KEY_NAME_DEV=garrett-hill-dev-s3
KEY_NAME_PROD=garrett-hill-prod-s3

cf create-service-key "${SERVICE_INSTANCE_NAME_DEV}" "${KEY_NAME_DEV}"
S3_CREDENTIALS_DEV=`cf service-key "${SERVICE_INSTANCE_NAME_DEV}" "${KEY_NAME_DEV}" | tail -n +2`

export AWS_ACCESS_KEY_ID_DEV=`echo "${S3_CREDENTIALS_DEV}" | jq -r .credentials.access_key_id`
export AWS_SECRET_ACCESS_KEY_DEV=`echo "${S3_CREDENTIALS_DEV}" | jq -r .credentials.secret_access_key`
export BUCKET_NAME_DEV=`echo "${S3_CREDENTIALS_DEV}" | jq -r .credentials.bucket`
export AWS_DEFAULT_REGION_DEV=`echo "${S3_CREDENTIALS_DEV}" | jq -r '.credentials.region'`

# cf create-service-key "${SERVICE_INSTANCE_NAME_PROD}" "${KEY_NAME_PROD}"
# S3_CREDENTIALS_PROD=`cf service-key "${SERVICE_INSTANCE_NAME_PROD}" "${KEY_NAME_PROD}" | tail -n +2`

# export AWS_ACCESS_KEY_ID_PROD=`echo "${S3_CREDENTIALS_PROD}" | jq -r .credentials.access_key_id`
# export AWS_SECRET_ACCESS_KEY_PROD=`echo "${S3_CREDENTIALS_PROD}" | jq -r .credentials.secret_access_key`
# export BUCKET_NAME_PROD=`echo "${S3_CREDENTIALS_PROD}" | jq -r .credentials.bucket`
# export AWS_DEFAULT_REGION_PROD=`echo "${S3_CREDENTIALS_PROD}" | jq -r '.credentials.region'`
