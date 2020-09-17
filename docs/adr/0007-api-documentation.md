# 7. API Documentation

## Status

Approved

## Context

There are a lot of tools available for documenting APIs. These tools generate easy to read documentation that can be used by frontend engineers and even third party developers. Setting up a documentation workflow will allow those engineers to integrate with the TTAHUB API faster and with more confidence. In addition, these API tools open a path for further testing and automation in the future, since the definition of the API is machine readable.

## Decision

We will document our API with [OpenAPI specification 3](https://swagger.io/specification/) (formally known as swagger).

## Consequences

OpenAPI specification is the most widely used API specification. There are a large number of tools available that can read OpenAPI spec definitions. Using OpenAPI specification will allow us to take advantage of these tools. Also if any new engineer coming onto the program has experience with an API specification it will most likely be with OpenAPI specification, decreasing onboarding time.
