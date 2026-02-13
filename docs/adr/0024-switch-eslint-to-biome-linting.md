# 24. Switch ESLint to Biome for Linting

Date: 2026-02-13

## Status

Proposed

## Context

The project currently uses ESLint v7 with separate backend and frontend configurations, plus multiple plugin chains and formatter integrations. This increases maintenance overhead and slows lint feedback in local development, pre-commit hooks, and CI.  We want to simplify linting while preserving existing workflow (`yarn lint`) and CI artifact behavior. We also want to avoid including a formatter migration into this change.

## Decision

We will replace ESLint with Biome for linting in a single cutover across backend and frontend.

This ADR is lint-only:
- Biome formatter will be disabled for now, deferred to the future.

Implementation decisions:
- Keep existing lint script names (`lint`, `lint:ci`, `lint:fix`, `lint:fix:single`, `lint:all`, `lint:fix:all`) and rewire them to Biome.
- Add a root `biome.json` for repository-wide lint configuration and ignores.
- Update the pre-commit hook to run Biome fixes on staged JS/TS files.
- Keep CI lint artifacts at `reports/lint.xml` and `frontend/reports/lint.xml` using Biome's JUnit reporter output.
- Remove ESLint-specific dependencies/config from `package.json` and `frontend/package.json`.

ADR relationship:
- This ADR supersedes the "Static Code Analysis with ESLint" subsection of ADR 9 (`0009-security-scans.md`).

## Consequences

Positive:
- Simpler lint toolchain with fewer plugin/version coordination points.
- Significantly faster lint execution and autofix workflows for local dev and CI.
- Reduction in old/unmaintained node.js packages
- Stable developer commands despite underlying tool change.
- Native Typescript support
- Easier configuration

Tradeoffs:
- Rule behavior is not a 1:1 mapping from ESLint + Airbnb plugins; some diagnostics will differ.
- Existing `eslint-disable` comments may need to be updated