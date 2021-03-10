# 9. Security Scans

Date: 2020-10-15

## Status

Accepted

## Context

**Static Code Analysis**

The code we write should be routinely and automatically scanned for programming and stylistic errors to ensure our code is highly readable, maintainable, and free of bugs. This scan should be performed in addition to developer code review. It will be most performant when run frequently and with little developer involvement.

**Static Security Audit of Package Dependencies**

Ensuring our node modules do not have security vulnerabilities prior to deployment gives us the opportunity to "find and fix known vulnerabilities in dependencies that could cause data loss, service outages, unauthorized access to sensitive information, or other issues" [ref NPM documentation](https://docs.npmjs.com/auditing-package-dependencies-for-security-vulnerabilities). This audit is most helpful when performed at frequent intervals and with little developer involvement.

**Dynamic Security Scan**

A dynamic security scan is needed to identify application features that could leave website data vulnerable to loss, corruption, or unauthorized access by malicious actors. This scan is most valuable when performed at frequent intervals and with little developer involvement.

## Decision

**Static Code Analysis with ESLint**

We will use ESLint for static code analysis. This tool is easy to integrate into most text editors and implements some fixes automatically, which means errors are fixed before code is committed to our version control system. The tool can also run as part of the Continuous Integration (CI) pipeline. The pipeline job will fail when ESLint identifies errors. Code can only be deployed if pipeline jobs pass. This analysis combined with the gate on failing jobs prevents bad code from being deployed to users.

**Static Security Audit of Package Dependencies with Yarn Audit**

We will use Yarn's `audit` command for static security audits. This tool checks for known security vulnerabilities in node modules and is frequently updated to detect new vulnerabilities. As we are already using Yarn for node module package management, using Yarn `audit` lets us avoid additional project complexity. Our CI pipeline will be configured to run this scan automatically each time code is committed to our version control system. The pipeline job will fail when vulnerabilities of a `MODERATE` or higher severity level are found, preventing node modules with known security vulnerabilities from being used in a deployed application.

**Dynamic Security Scan with Open Web Application Security Project Zed Attack Proxy (OWASP ZAP)**

We will use OWASP ZAP's baseline scan to test application security. The tool is free, open-source, and updated and released weekly. Our CI pipeline will be configured to run this scan automatically each time code is committed to our version control system. The pipeline job will fail when the scanner finds vulnerabilities marked as `FAIL` in the ZAP configuration file. This pipeline failure prevents vulnerable code from being deployed.

## Consequences

Running these code analysis and scanning tools increases the time it takes to run our CI pipeline. Prior to these additions, the CI pipeline took 3-5 minutes to run. Linting and static security audits add a negligible amount to the runtime, about 2 seconds each. The dynamic security scan takes much longer, around 3 and half minutes to complete. However the total time to run the full CI pipeline is still quite short, around 5-7 minutes.

Adding new tools to the development ecosystem increases the complexity of the product and requires developer time and attention.
