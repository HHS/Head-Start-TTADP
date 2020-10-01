# 7. Use PlantUML for diagrams

Date: 2020-10-01

## Status

Accepted

## Context

Certain things we need to document, such as our data model and boundary diagrams are
better represented as diagrams than text. Choosing a single service will make it easier to
learn the system and keep diagrams up to date.

## Decision

We will use https://www.plantuml.com to generate diagrams with the following checks:

1. We will not rely on the plantuml.com service to be the sole storage medium for the actual UML text
1. We will store each type of diagram in its own markdown file in the /docs folder

PlantUML can also be run locally, in case the plantuml.com service ever goes away. This risk is also why
we must keep the UML source in our source control.

## Consequences

Using PlantUML will make it easier to keep diagrams up to date to smooth document delivery to OCIO for ATO and other oversight tasks.
