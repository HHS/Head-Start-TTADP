# 7. Use Mermaid for diagrams

Date: 2020-10-01

## Status

Accepted

## Context

Certain things we need to document, such as our data model and boundary diagrams are
better represented as diagrams than text. Choosing a single service will make it easier to
learn the system and keep diagrams up to date.

## Decision

We will use Mermaid diagrams in GitHub-flavored Markdown with the following checks:

1. We will store each type of diagram in its own markdown file in the /docs folder
1. We will keep the Mermaid source in source control

Mermaid renders directly in GitHub, removing reliance on external diagram services while keeping diagram
source alongside the documentation.

## Consequences

Using Mermaid will make it easier to keep diagrams up to date and visible in GitHub to smooth document delivery
to OCIO for ATO and other oversight tasks.
