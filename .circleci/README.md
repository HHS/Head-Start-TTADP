# CircleCI Configuration Documentation

This document provides an overview of the CircleCI configuration for the project, focusing on manual triggers and scheduled jobs. The configuration automates building, testing, deploying, and managing environments for the application across different stages (development, staging, production).

## Table of Contents

- [Introduction](#introduction)
- [Overview of CircleCI Workflows](#overview-of-circleci-workflows)
  - [Build, Test, and Deploy Workflow](#build-test-and-deploy-workflow)
  - [Scheduled Workflows](#scheduled-workflows)
    - [Daily Security Scan](#daily-security-scan)
    - [Daily Production Backup](#daily-production-backup)
    - [Automated Environment Management](#automated-environment-management)
  - [Manual Workflows](#manual-workflows)
    - [Manual Production Backup](#manual-production-backup)
    - [Manual Environment Management](#manual-environment-management)
- [Manual Triggers](#manual-triggers)
  - [Triggering a Manual Production Backup](#triggering-a-manual-production-backup)
  - [Managing Environments Manually](#managing-environments-manually)
- [Scheduled Jobs Explained](#scheduled-jobs-explained)
  - [Cron Schedule Reference](#cron-schedule-reference)
- [Environment Variables and Secrets](#environment-variables-and-secrets)
- [Conclusion](#conclusion)

## Introduction

This document explains the CircleCI configuration used to automate various tasks such as building, testing, deploying, and managing environments. The focus is on manual triggers and scheduled jobs that help maintain the application's health and availability across different environments.

## Overview of CircleCI Workflows

The CircleCI configuration defines several workflows that orchestrate jobs to perform specific tasks. Here's an overview:

### Build, Test, and Deploy Workflow

**Workflow Name:** `build_test_deploy`

**Purpose:** Automates the process of building the code, running tests, and deploying the application to the appropriate environment based on the branch.

**Trigger Conditions:**

- **Automatically triggered** when there is a push to specific branches and both `manual-trigger` and `manual-manage-env` parameters are `false`.

**Jobs Involved:**

1. **Build and Lint Jobs:**
   - `build_and_lint`: Lints the backend code.
   - `build_and_lint_similarity_api`: Lints the similarity API code.

2. **Testing Jobs:**
   - `test_backend`: Runs backend tests.
   - `test_frontend`: Runs frontend tests.
   - `test_e2e`: Runs end-to-end tests.
   - `test_api`: Runs API tests.
   - `test_similarity_api`: Tests the similarity API.
   - `test_utils`: Runs utility tests.
   - `cucumber_test`: Runs Cucumber tests.
   - `dynamic_security_scan`: Performs a security scan using OWASP ZAP.

3. **Deployment Job:**
   - `deploy`: Deploys the application to the appropriate environment (sandbox, dev, staging, prod) based on the branch and repository URL.

### Scheduled Workflows

#### Daily Security Scan

**Workflow Name:** `daily_scan`

**Purpose:** Runs a comprehensive security scan daily to identify vulnerabilities.

**Schedule:**

- **Cron Expression:** `0 12 * * 1-5` (Runs at 12:00 UTC, Monday to Friday)

**Jobs Involved:**

- Same as the build and test jobs in the `build_test_deploy` workflow up to `dynamic_security_scan`.

#### Daily Production Backup

**Workflow Name:** `daily_backup_upload_production`

**Purpose:** Performs a daily backup of the production database and uploads it to a secure location.

**Schedule:**

- **Cron Expression:** `0 10 * * 1-5` (Runs at 10:00 UTC, Monday to Friday)

**Jobs Involved:**

- `backup_upload_production`: Backs up the production database and uploads it.

#### Automated Environment Management

These workflows automatically start and stop lower environments (development and sandbox) to optimize resource usage.

##### Stop Lower Environments

**Workflow Name:** `stop_lower_env_workflow`

**Purpose:** Stops specified lower environments at the end of the day to save resources.

**Schedule:**

- **Cron Expression:** `0 1 * * 2-6` (Runs at 01:00 UTC, Tuesday to Saturday, which is 6 PM PST Monday to Friday)

**Jobs Involved:**

- `manage_env_apps`: Stops the specified environments.

##### Start Lower Environments

**Workflow Name:** `start_lower_env_workflow`

**Purpose:** Starts specified lower environments at the beginning of the day to ensure they are ready for use.

**Schedule:**

- **Cron Expression:** `0 11 * * 1-5` (Runs at 11:00 UTC, Monday to Friday, which is 6 AM EST Monday to Friday)

**Jobs Involved:**

- `manage_env_apps`: Starts the specified environments.

### Manual Workflows

#### Manual Production Backup

**Workflow Name:** `manual_backup_upload_production`

**Purpose:** Allows manual triggering of a production database backup.

**Trigger Conditions:**

- **Manually triggered** when the `manual-trigger` parameter is set to `true`.

**Jobs Involved:**

- `backup_upload_production`: Backs up the production database and uploads it.

#### Manual Environment Management

**Workflow Name:** `manual_manage_env_workflow`

**Purpose:** Allows manual control over starting, stopping, restarting, or restaging environments.

**Trigger Conditions:**

- **Manually triggered** when the `manual-manage-env` parameter is set to `true`.

**Jobs Involved:**

- `manage_env_apps`: Manages the specified environments based on the `env_state` parameter.

## Manual Triggers

### Triggering a Manual Production Backup

To manually trigger a production backup:

1. Set the `manual-trigger` parameter to `true`.
2. Ensure you have the necessary permissions and environment variables set.
3. Trigger the `manual_backup_upload_production` workflow through the CircleCI interface or API.

### Managing Environments Manually

To manually manage environments:

1. Set the `manual-manage-env` parameter to `true`.
2. Specify the environments you want to manage in the `env_list` parameter (e.g., `tta-smarthub-dev,tta-smarthub-sandbox`).
3. Set the desired action in the `env_state` parameter (`start`, `stop`, `restart`, `restage`).
4. Trigger the `manual_manage_env_workflow` through the CircleCI interface or API.

## Scheduled Jobs Explained

### Cron Schedule Reference

- **Daily Security Scan (`daily_scan`):**
  - **Cron:** `0 12 * * 1-5`
  - **Time:** 12:00 PM UTC, Monday to Friday

- **Daily Production Backup (`daily_backup_upload_production`):**
  - **Cron:** `0 10 * * 1-5`
  - **Time:** 10:00 AM UTC, Monday to Friday

- **Stop Lower Environments (`stop_lower_env_workflow`):**
  - **Cron:** `0 1 * * 2-6`
  - **Time:** 1:00 AM UTC, Tuesday to Saturday (6:00 PM PST, Monday to Friday)

- **Start Lower Environments (`start_lower_env_workflow`):**
  - **Cron:** `0 11 * * 1-5`
  - **Time:** 11:00 AM UTC, Monday to Friday (6:00 AM EST, Monday to Friday)

These scheduled jobs help maintain the application's health, optimize resource usage, and ensure that security scans and backups are performed regularly.

## Environment Variables and Secrets

The workflows rely on various environment variables and secrets for authentication, configuration, and deployment. These are typically stored securely in CircleCI's project settings and include:

- **Cloud Foundry Credentials:** For deploying and managing applications in different spaces.
- **Authentication Secrets:** Client IDs and secrets for application authentication.
- **Database Credentials:** For connecting to and backing up databases.
- **New Relic API Keys:** For notifying New Relic about deployments.
- **SMTP Settings:** For email functionalities.
- **Slack Tokens:** For sending notifications to Slack channels.
- **Other Secrets:** Such as session secrets, JWT secrets, and API keys.

**Note:** Always ensure that sensitive information is securely stored and not exposed in the code or logs.

## Conclusion

This CircleCI configuration automates critical aspects of the application's lifecycle, including building, testing, deploying, and environment management. By leveraging manual triggers and scheduled jobs, the team can maintain control over the deployment process while ensuring regular maintenance tasks are performed without manual intervention.

For any questions or issues related to this configuration, please reach out to the DevOps team or consult the project's documentation.
