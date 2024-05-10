#!/bin/bash

# Function to check if the installation directory exists
check_install_dir() {
    local install_dir="$1"  # Pass the installation directory as an argument

    # Check if the directory exists
    if [ -d "$install_dir" ]; then
        echo "Installation directory $install_dir already exists. Exiting the script."
        exit 0
    else
        echo "Installation directory $install_dir does not exist. Continuing with installation."
    fi
}

# Function to download AWS CLI
download_aws_cli() {
    local aws_cli_url="$1"
    local zip_file="$2"
    echo "Downloading AWS CLI..."
    if ! wget "$aws_cli_url" -O "$zip_file"; then
        echo "Failed to download AWS CLI."
        exit 1
    fi
    echo "Download completed successfully."
}

# Function to install AWS CLI
install_aws_cli() {
    local zip_file="$1"
    local install_dir="$2"
    local bin_dir="$3"
    echo "Installing AWS CLI..."
    if ! unzip "$zip_file" -d "/tmp/local"; then
        echo "Failed to unzip AWS CLI package."
        exit 1
    fi
    if ! ./aws/install -i "$install_dir" -b "$bin_dir"; then
        echo "Failed to install AWS CLI."
        exit 1
    fi
    echo "Installation completed successfully."
}

# Function to verify installation
verify_installation() {
    local bin_dir="$1"
    echo "Verifying AWS CLI installation..."
    if ! "$bin_dir/aws" --version; then
        echo "Verification failed."
        exit 1
    fi
    echo "AWS CLI is installed successfully: $($bin_dir/aws --version)"
}

# Function to clean up installation files
cleanup() {
    local zip_file="$1"
    local aws_dir="$2"
    echo "Cleanup install files"
    if [ -f "$zip_file" ]; then
        rm "$zip_file"
        echo "The zip file has been deleted."
    else
        echo "The zip file does not exist."
    fi
    if [ -d "$aws_dir" ]; then
        rm -r "$aws_dir"
        echo "The 'aws' directory has been deleted."
    else
        echo "The 'aws' directory does not exist."
    fi
}

# Main function to control workflow
main() {
    local aws_cli_url="https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip"
    local install_dir="/tmp/local/aws-cli"
    local zip_file="/tmp/local/awscliv2.zip"
    local bin_dir="/tmp/local/bin"
    local aws_dir="/tmp/local/aws"

    check_install_dir "${install_dir}"
    download_aws_cli "${aws_cli_url}" "${zip_file}"
    install_aws_cli "${zip_file}" "${install_dir}" "${bin_dir}"
    verify_installation "${bin_dir}"
    cleanup "${zip_file}" "${aws_dir}"
}

# Calling the main function
main
