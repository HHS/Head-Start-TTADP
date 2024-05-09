#!/bin/bash

# Configuration variables
POSTGRES_VERSION="14.2"
POSTGRES_URL="https://example.com/path/to/postgres-bin.tar.gz" # Replace with actual URL
INSTALL_DIR="/usr/local/pgsql"

# Function to download PostgreSQL binaries
download_postgres() {
    echo "Downloading PostgreSQL $POSTGRES_VERSION binaries..."
    if ! wget $POSTGRES_URL -O postgres-bin.tar.gz; then
        echo "Failed to download PostgreSQL binaries."
        exit 1
    fi
    echo "Download completed successfully."
}

# Function to extract PostgreSQL binaries
extract_postgres() {
    echo "Extracting PostgreSQL binaries..."
    if ! tar -zxvf postgres-bin.tar.gz; then
        echo "Failed to extract PostgreSQL binaries."
        exit 1
    fi
    echo "Extraction completed successfully."
}

# Function to install PostgreSQL binaries
install_postgres() {
    echo "Installing PostgreSQL binaries..."
    sudo mkdir -p $INSTALL_DIR
    if ! sudo cp -r postgresql/* $INSTALL_DIR/; then
        echo "Failed to install PostgreSQL binaries."
        exit 1
    fi
    echo "Installation completed successfully."
}

# Function to configure environment variables
configure_environment() {
    echo "Configuring environment variables..."
    echo "export PATH=\"$INSTALL_DIR/bin:\$PATH\"" >> ~/.bashrc
    export PATH="$INSTALL_DIR/bin:$PATH"
    if ! command -v pg_dump &>/dev/null; then
        echo "Failed to configure environment variables."
        exit 1
    fi
    echo "Environment variables configured successfully."
}

# Function to verify installation
verify_installation() {
    echo "Verifying PostgreSQL installation..."
    if ! pg_dump --version; then
        echo "Verification failed."
        exit 1
    fi
    echo "PostgreSQL is installed successfully: $(pg_dump --version)"
}

# Main function to control workflow
main() {
    download_postgres
    extract_postgres
    install_postgres
    configure_environment
    verify_installation
}

# Calling the main function
main
