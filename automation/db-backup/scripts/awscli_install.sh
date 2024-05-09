#!/bin/bash

# Configuration variables
AWS_CLI_URL="https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip"
INSTALL_DIR="/usr/local/aws-cli"
ZIP_FILE="awscliv2.zip"

# Function to download AWS CLI
download_aws_cli() {
    echo "Downloading AWS CLI..."
    if ! wget $AWS_CLI_URL -O $ZIP_FILE; then
        echo "Failed to download AWS CLI."
        exit 1
    fi
    echo "Download completed successfully."
}

# Function to install AWS CLI
install_aws_cli() {
    echo "Installing AWS CLI..."
    if ! unzip $ZIP_FILE; then
        echo "Failed to unzip AWS CLI package."
        exit 1
    fi
    if ! sudo ./aws/install -i $INSTALL_DIR -b /usr/local/bin; then
        echo "Failed to install AWS CLI."
        exit 1
    fi
    echo "Installation completed successfully."
}

# Function to verify installation
verify_installation() {
    echo "Verifying AWS CLI installation..."
    if ! aws --version; then
        echo "Verification failed."
        exit 1
    fi
    echo "AWS CLI is installed successfully: $(aws --version)"
}

# Main function to control workflow
main() {
    download_aws_cli
    install_aws_cli
    verify_installation
}

# Calling the main function
main
