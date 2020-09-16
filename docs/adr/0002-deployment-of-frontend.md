# 2. Deployment of static frontend

Date: 2020-08-17

## Status

Accepted

## Context

There are two purposed ways to setup the frontend and backend of the TTADP system.

 1. The backend hosts the static frontend directly; there is one app. The single app will require one Authority to Operate (ATO). Some tooling can easily be shared between the frontend and backend. Also synchronized deploys will be easier to accomplish with a single app.

 2. The backend and frontend are two separate apps, the backend a node express app and the frontend static HTML, javascript and CSS. Two apps allow for greater separation between the two components. The ATO will be more complicated to document. Tooling will be harder to share when the apps are split into two.

## Decision

We will have a single unified app that combines the frontend and backend.

## Consequences

A single application allows us to have a simpler ATO. It also makes synchronized deployments easier and enables sharing of tooling which should simplify the build process. It may be a little harder for newer engineers to understand the build process for the combined frontend and backend, but that can be mitigated with thorough documentation.
