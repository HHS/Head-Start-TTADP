# 7. Migrate from PUML to Mermaid for diagrams

Date: 2025-12-29

## Status

Pending

## Context

Due to its dependency on Java and GraphViz, Plant UML requires an external service to render diagrams, resulting in needing to switch between tools and render the diagram in a separate step to include it in the repo.  Mermaid is a newer approach that shares many syntax similarities to PUML, while also offering native rendering in tools such as GitHub.

## Decision

We will use Mermaid diagrams in GitHub-flavored Markdown with the following checks:

1. We will store each type of diagram in its own markdown file in the /docs folder
1. We will keep the Mermaid source in source control

Mermaid renders directly in GitHub, removing reliance on external diagram services while keeping diagram
source alongside the documentation.

## Consequences

Using Mermaid will make it easier to keep diagrams up to date and visible in GitHub to smooth document delivery
to OCIO for ATO and other oversight tasks.
