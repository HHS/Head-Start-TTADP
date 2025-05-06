#!/usr/bin/env bash

set -e

MESSAGE_TYPE=${1}
MESSAGE_ARG=${2}
SLACK_CHANNEL=${3}

# Example usage: 
# ./notify-slack.sh string "Hello Slack" "#general"
# ./notify-slack.sh path "/tmp/message_file" true "#general"

if [ ${MESSAGE_TYPE} == "path" ]; then
    if [ -f "${MESSAGE_ARG}" ]; then
        MESSAGE_TEXT=$(cat "${MESSAGE_ARG}")
    else
        echo "${MESSAGE_ARG} does not exist."
        exit 1
    fi
else 
    MESSAGE_TEXT="${MESSAGE_ARG}"
fi

if [ -z "${SLACK_BOT_TOKEN}" ] || [ -z "${SLACK_CHANNEL}" ] || [ -z "${MESSAGE_TEXT}" ]; then
    echo "Missing required parameters."
    echo "channel: ${SLACK_CHANNEL}"
    echo "message: ${MESSAGE_TEXT}"
    echo "token: ${#SLACK_BOT_TOKEN} chars"
    exit 1
fi

echo "Sending: ${MESSAGE_TEXT} to ${SLACK_CHANNEL}"

# response=$(curl -s -X POST \
#     -H "Authorization: Bearer << parameters.slack_bot_token >>" \
#     -H 'Content-type: application/json;charset=utf-8' \
#     --data "{
#         \"channel\": \"${SLACK_CHANNEL}\",
#         \"text\": \"${MESSAGE_TEXT}\"
#     }" \
#     https://slack.com/api/chat.postMessage)

ok=$(echo "${response}" | jq -r '.ok')
error=$(echo "${response}" | jq -r '.error')

if [ "${ok}" != "true" ]; then
    echo "Slack notification failed: ${error}"
    exit 1
else
    echo "Slack notification sent successfully"
fi
