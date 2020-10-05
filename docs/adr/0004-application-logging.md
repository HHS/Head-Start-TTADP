# 4. Application Logging

Date: 2020-08-25

## Status

Approved

## Context

There are a few different options for application logging.

 1. Logging to file(s) used to be the norm. Logging to a file has several issues, however. You must be on the host to view the log file, or setup a system to ship the log file off the host. You must rotate log files or your host will eventually run out of disk space.

 2. Logging to stdout and letting a different system handle the logging is a more modern approach to logging. In our case cloud.gov takes care of gathering logs sent to stdout/stderr. Logs can be viewed with a cloud.gov cli tool.

## Decision

We will log to stdout/stderr. On development machines logs will be presented as human readable strings. In deployed environments (dev, staging and prod) logs will be formatted in JSON.

## Consequences

Sending logs to stdout/stderr simplifies a lot of management tasks. We can take advantage of the logging system cloud.gov provides. On development machines having logs be human readable is important when developing/troubleshooting. JSON vs string output will be configurable with an environment variable (see ADR [#3](./0003-configuration.md)). Machine readable logs in deployed environments will allow the logs to be ingestible by log aggregation services in the future.
