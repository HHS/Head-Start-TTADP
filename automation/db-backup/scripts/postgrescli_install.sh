#!/bin/bash

# Function to check if the installation directory exists
check_install_dir() {
    local install_dir="$1"

    # Check if the directory exists
    if [ -d "$install_dir" ]; then
        echo "Installation directory $install_dir already exists. Exiting the script."
        exit 1
    else
        echo "Installation directory $install_dir does not exist. Continuing with installation."
    fi
}

# Function to download the PostgreSQL deb package
download_postgresql_deb() {
    local deb_url="$1"
    local deb_file="$2"
    echo "Downloading PostgreSQL deb package..."
    if ! wget "$deb_url" -O "$deb_file"; then
        echo "Failed to download PostgreSQL deb package."
        exit 1
    fi
    echo "Download completed successfully."
}

# Function to extract and install pg_dump
install_pg_dump() {
    local deb_file="$1"
    local bin_dir="$2"
    echo "Extracting pg_dump from deb package..."
    mkdir -p extract-deb
    cd extract-deb
    ar x "$deb_file"
    tar -xf data.tar.*
    # Locate pg_dump in the provided directory structure
    if [ -f "./usr/lib/postgresql/15/bin/pg_dump" ]; then
        cp "./usr/lib/postgresql/15/bin/pg_dump" "$bin_dir"
        echo "pg_dump installation completed successfully."
    else
        echo "pg_dump not found in the deb package."
        exit 1
    fi
    cd ..
}

# Function to verify installation
verify_installation() {
    local bin_dir="$1"
    echo "Verifying pg_dump installation..."
    if ! "$bin_dir/pg_dump" --version; then
        echo "Verification failed."
        exit 1
    fi
    echo "pg_dump is installed successfully: $($bin_dir/pg_dump --version)"
}

# Function to clean up installation files and temporary directories
cleanup() {
    local deb_file="$1"
    echo "Cleanup install files and temporary directories"
    if [ -f "$deb_file" ]; then
        rm "$deb_file"
        echo "The deb file has been deleted."
    else
        echo "The deb file does not exist."
    fi
    if [ -d "extract-deb" ]; then
        rm -r "extract-deb"
        echo "Temporary extraction directory has been deleted."
    else
        echo "No temporary extraction directory to delete."
    fi
}

# Main function to control workflow
main() {
    local deb_url="http://security.debian.org/debian-security/pool/updates/main/p/postgresql-15/postgresql-client-15_15.6-0+deb12u1_amd64.deb"
    local deb_file="/tmp/postgresql.deb"
    local bin_dir="/tmp/local/bin"  # Ensure you have permission to write here, or use sudo

    check_install_dir "$bin_dir/pg_dump"
    download_postgresql_deb "$deb_url" "$deb_file"
    install_pg_dump "$deb_file" "$bin_dir"
    verify_installation "$bin_dir"
    cleanup "$deb_file"
}

# Calling the main function
main
