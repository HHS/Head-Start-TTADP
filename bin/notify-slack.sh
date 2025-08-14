#!/usr/bin/env bash

set -e

MESSAGE_TEXT=${1}
SLACK_CHANNEL=${2}
SLACK_BOT_TOKEN=${3}

# Example usage: 
# ./notify-slack.sh "Hello Slack" "general"

echo "channel: ${SLACK_CHANNEL}"
echo "message: ${MESSAGE_TEXT}"
echo "token: ${#SLACK_BOT_TOKEN} chars"

if [ -z "${SLACK_BOT_TOKEN}" ] || [ -z "${SLACK_CHANNEL}" ] || [ -z "${MESSAGE_TEXT}" ]; then
    echo "Missing required parameters"
    exit 1
fi

echo "Sending to #${SLACK_CHANNEL}: ${MESSAGE_TEXT}"

response=$(curl -sv -X POST \
    -H "Authorization: Bearer ${SLACK_BOT_TOKEN}" \
    -H 'Content-type: application/json;charset=utf-8' \
    --data "{ \
        \"channel\": \"${SLACK_CHANNEL}\",
        \"text\": \"${MESSAGE_TEXT}\"
     }" \
     https://slack.com/api/chat.postMessage)

ok=$(echo "${response}" | jq -r '.ok')
error=$(echo "${response}" | jq -r '.error')

if [ "${ok}" != "true" ]; then
    echo "Slack notification failed: ${error}"
    exit 1
else
    echo "Slack notification sent successfully"
fi
