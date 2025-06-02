# CircleCI Configuration Documentation

This document provides an overview of the CircleCI configuration for the project, focusing on workflows, manual triggers, and scheduled jobs. The configuration automates building, testing, deploying, and managing environments for the application across different stages (development, staging, production).

---

## Table of Contents

- [Introduction](#introduction)
- [Executors](#executors)
- [Commands](#commands)
- [Jobs](#jobs)
- [Workflows](#workflows)
  - [Build, Test, and Deploy Workflow](#build-test-and-deploy-workflow)
  - [Daily Scheduled Workflows](#daily-scheduled-workflows)
  - [Manually Triggered Workflows](#manually-triggered-workflows)
- [Environment Variables and Secrets](#environment-variables-and-secrets)
- [Conclusion](#conclusion)

---

## Introduction

This CircleCI configuration is designed to automate various tasks such as building, testing, deploying, and managing the application's environments. Key workflows include manual and scheduled tasks, automated testing pipelines, and deployment workflows for development, staging, and production environments.

---

## Executors

CircleCI executors define the environment in which each job runs.

- **Docker Executor**: Used for most tasks, leveraging a Node.js image with browser support for building and testing.
- **Docker Postgres Executor**: Combines Node.js with a PostgreSQL instance for database-related testing.
- **Machine Executor**: Provides a full virtual machine for tasks requiring more control, like dynamic security scans.
- **AWS Executor**: Configured for workflows requiring AWS tools or resources.

---

## Commands

Commands in this configuration abstract common steps for reuse across multiple jobs:

1. **Sparse Checkout**: Enables cloning only the necessary parts of the repository for specific workflows, reducing resource usage.
2. **Create Combined Yarn Lock**: Merges multiple `yarn.lock` files into one to use as a cache key.
3. **Notify New Relic**: Sends deployment notifications to New Relic for tracking environment changes.
4. **Notify Slack**: Posts messages to a specified Slack channel with customizable content.
5. **Cloud Foundry Deploy**: Handles logging in and deploying applications to Cloud Foundry environments.
6. **Cloud Foundry Automation Task**: Runs specific tasks in Cloud Foundry environments, such as database migrations or processing data.

---

## Jobs

The configuration includes jobs tailored to specific purposes:

- **Build and Lint**: Runs lint checks for backend and frontend code and builds assets.
- **Test Backend**: Runs backend tests, including database migration and seeding.
- **Test Frontend**: Executes frontend tests using Jest, with coverage checks for modified lines.
- **Test End-to-End**: Uses Playwright for E2E testing, ensuring workflows function correctly.
- **Dynamic Security Scan**: Runs OWASP ZAP scans to identify vulnerabilities in the application.
- **Deploy**: Pushes applications to appropriate Cloud Foundry environments based on branch.
- **Backup Upload Production**: Creates a backup of the production database and uploads it to a secure location.
- **Restore and Process Data**: Restores a backup to a processing environment and runs scripts to anonymize or prepare the data.

---

## Workflows

Workflows orchestrate the execution of jobs, grouping them by purpose and defining triggers:

### Build, Test, and Deploy Workflow

This workflow automates the building, testing, and deployment process for the application. It triggers on pushes to specific branches unless manual flags are set. It consists of:

1. **Build and Lint**
2. **Backend, Frontend, and E2E Tests**
3. **Dynamic Security Scan**
4. **Deploy**: Deploys to `sandbox`, `dev`, `staging`, or `prod` environments based on the branch.

---

### Daily Scheduled Workflows

These workflows are triggered at regular intervals using cron schedules:

1. **Daily Security Scan**:
   - Runs a comprehensive set of tests and OWASP ZAP scans to detect vulnerabilities.
   - Scheduled at 12:00 UTC, Monday to Friday.

2. **Daily Backup Upload Production**:
   - Creates a backup of the production database, processes it, and restores it to staging, sandbox, and dev environments for testing.
   - Scheduled at 10:00 UTC, Monday to Friday.

---

### Manually Triggered Workflows

The configuration supports several workflows that can be manually triggered using flag variables:

1. **Manual Backup Upload Production** (`manual-trigger`):
   - Backs up the production database and uploads it to a secure location.

2. **Manual Restore Production** (`manual-restore`):
   - Restores the production database to a processing environment.

3. **Manual Process Production** (`manual-process`):
   - Processes data in the production environment, typically for anonymization or cleanup.

4. **Manual Process Backup** (`manual-backup`):
   - Processes and uploads a backup for distribution to other environments.

5. **Manual Restore to Staging, Sandbox, or Dev** (`manual-restore-staging`, `manual-restore-sandbox`, `manual-restore-dev`):
   - Restores processed backups to the respective environments for further testing or analysis.

---

## Environment Variables and Secrets

Environment variables store sensitive information such as API keys, database credentials, and Cloud Foundry login details. These are securely managed in CircleCI’s settings and passed into jobs as needed.

Key variables include:

- **Authentication Credentials**: For Cloud Foundry and other external services.
- **Database Connection Details**: For running migrations, tests, and backups.
- **Slack and New Relic Keys**: For notifications and deployment tracking.

---

## Conclusion

This CircleCI configuration is designed to automate critical aspects of the application's lifecycle, ensuring consistent builds, thorough testing, and seamless deployments across environments. Manual triggers and scheduled jobs allow flexibility while maintaining reliability. For questions, consult the DevOps team or project documentation.
