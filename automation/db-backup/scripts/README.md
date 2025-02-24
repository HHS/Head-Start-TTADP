# DB Backup Tool

The `db_backup.sh` script automates the process of backing up PostgreSQL databases and securely uploading them to AWS S3, ensuring data integrity through meticulous verification processes.

## Features

- **Automated Database Backups**: Simplifies the backup of PostgreSQL databases.
- **Secure Uploads to AWS S3**: Encrypts and uploads backup files to a specified S3 bucket.
- **Data Integrity Verification**: Includes MD5 and SHA256 checksum calculations to ensure data integrity.
- **Dynamic Environment Configuration**: Configures AWS and PostgreSQL client environments dynamically using provided JSON configurations.
- **Logging and Monitoring**: Provides detailed logging and memory usage monitoring throughout the operation.

## Prerequisites

Before using this script, make sure the following prerequisites are met:

- **Cloud Foundry CLI**: Must be logged into your Cloud Foundry environment.
- **AWS CLI**: Must be configured with access to your AWS resources.
- **PostgreSQL CLI Tools**: Including `pg_dump` and `pg_isready` for database operations.
- **OpenSSL**: Used for generating random passwords for the zip files.
- **jq**: Needed for parsing and manipulating JSON data.
- **zip**: Required for compressing the backup files.

## Installation

1. Clone or download this script to your local system or server where backups will be performed.
2. Ensure the script is executable:
   ```bash
   chmod +x db_backup.sh
   ```
3. Configure your AWS CLI with the appropriate credentials and regions to ensure access to your S3 buckets.
   
## Usage
Run the script with the necessary parameters:

```bash
Copy code
./db_backup.sh [backup_filename_prefix] [rds_server] [aws_s3_server]
```
- **backup_filename_prefix**: The prefix for the backup files, which helps in organizing and identifying backups.
- **rds_server**: The identifier for the RDS server in the JSON configuration that holds the credentials.
- **aws_s3_server**: The identifier for the AWS S3 service in the JSON configuration used for uploads.

## Configuration
Ensure that your VCAP_SERVICES environment variable is properly configured with the necessary service bindings for RDS and AWS S3 services. The script will parse these configurations to setup the environment.

## Detailed Workflow
- **Validation**: Checks for all required parameters and environmental configurations.
- **Dependency Check**: Ensures all required dependencies are installed.
- **Environment Setup**: Configures PostgreSQL and AWS CLI environments using credentials extracted from VCAP_SERVICES.
- **Backup and Upload**:
-- Performs a database dump using pg_dump.
-- Compresses the dump using a randomly generated password.
-- Uploads the compressed file along with its MD5 and SHA256 checksums to S3.
-- Verifies the uploaded files' integrity by comparing checksums.
- **Cleanup**: Clears sensitive environment variables to secure the operational environment.

## Logs and Monitoring
The script includes comprehensive logging that captures each step's success or failure, providing timestamps and detailed error messages if failures occur. Memory usage of the process is monitored and logged to help in diagnosing issues related to system resource utilization.