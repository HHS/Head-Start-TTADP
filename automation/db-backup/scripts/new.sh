#!/bin/bash
set -e
set -u
set -o pipefail
set -o noglob
set -o noclobber

SERVICE_INSTANCE_NAME="ttahub-db-backups"
KEY_NAME="debug-key"

S3_CREDENTIALS=$(cf service-key "${SERVICE_INSTANCE_NAME}" "${KEY_NAME}" | tail -n +2)

export AWS_ACCESS_KEY_ID=$(echo "${S3_CREDENTIALS}" | jq -r '.credentials.access_key_id')
export AWS_SECRET_ACCESS_KEY=$(echo "${S3_CREDENTIALS}" | jq -r '.credentials.secret_access_key')
export BUCKET_NAME=$(echo "${S3_CREDENTIALS}" | jq -r '.credentials.bucket')
export AWS_DEFAULT_REGION=$(echo "${S3_CREDENTIALS}" | jq -r '.credentials.region')

#aws s3 ls s3://${BUCKET_NAME} --recursive --summarize --human-readable | tail -n 2

# production or proccessed
# production/production-2025-09-21-04-11-55-UTC.sql.zenc
#aws s3 ls s3://${BUCKET_NAME}/production --human-readable | tail -n 20

#aws s3api list-objects --bucket ${BUCKET_NAME} --query "Contents[?contains(Key, 'production/production-2025-09')]" | jq -r '.[].Key' | grep "zenc"

#aws s3 cp s3://${BUCKET_NAME}/production/production-latest-backup.txt .

DATE=$1

if [[ $DATE == "latest" ]]; then
    echo "Downloading latest backup"
else 
    echo "Downloading backup for date: ${DATE}"
    result=$(aws s3api list-objects --bucket ${BUCKET_NAME} --query "Contents[?contains(Key, 'production/production-${DATE}')]")
    if [[ $result == "[]" ]]; then
        echo "No backups found for date: ${DATE}"
        exit 1
    else 
        echo $result | jq -r '.[].Key' | grep "zenc"
    fi
fi