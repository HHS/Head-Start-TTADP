#!/bin/bash
# this script requires you to target the sandbox space locally
# of cloud foundry
#
#  (to change target space in cloud foundry
# `cf target -s SPACE_NAME)

# Define SFTP server details
SFTP_SERVER="sftp.itams.ohs.acf.hhs.gov"
SFTP_USERNAME="tta_ro"
SFTP_REMOTE_DIR="/ProdTTAHome/"
LOCAL_DIR="../monitoring"
APP_NAME="tta-smarthub-sandbox"

# SSH into the gateway container
cf ssh "$APP_NAME" -L 2222:$SFTP_SERVER:22 -N &

# Sleep for a moment to allow the SSH tunnel to be established
sleep 5

# Download zip files using SFTP through the tunnel
sftp -oPort=2222 -oBatchMode=no -oHostKeyAlgorithms=+ssh-dss "$SFTP_USERNAME@localhost" <<EOF
cd "$SFTP_REMOTE_DIR"
get *.zip "$LOCAL_DIR/"
exit
EOF

# Close the SSH tunnel
pkill -f "cf ssh $APP_NAME -L 2222:$SFTP_SERVER:22 -N"
