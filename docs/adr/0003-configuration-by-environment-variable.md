# 3. Configuration By Environment Variable

Date: 2020-08-25

## Status

Approved

## Context

Applications need to be configured differently depending on where they are running. For example, the backend running locally will have different configuration then the backend running in production.

## Decision

We will use environment variables to configure applications.

## Consequences

Using environment variables allows us to easily configure applications consistently. There is good support in cloud.gov for configuration via environment variables. Also the frontend will be easy to configure because there are frontend libraries that allow setting of environment variables with `.env` files.
