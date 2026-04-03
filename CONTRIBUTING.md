# Contributing to TTA Smart Hub

Thank you for your interest in contributing to the Office of Head Start TTA Smart Hub.

## Getting Started

1. Set up your local environment by following the [Dev Setup Guide](./docs/guides/dev-setup.md).
2. Review the [Tech Stack](./docs/tech-stack.md) for current technology versions.
3. See [Yarn Commands](./docs/guides/yarn-commands.md) for a quick reference of available commands.

## Code Style

We prefer TypeScript for new backend files and follow existing patterns in the surrounding code. All changes must pass lint checks (`yarn lint:all`).

For the full guide — including frontend CSS conventions, Sequelize patterns, error handling, and WYSIWYG editor notes — see [Best Practices](./best_practices.md).

## Testing

- Add or update tests for any behavior changes.
- Prefer focused unit/integration tests; add E2E only when user-facing flow changes.
- Avoid network calls in unit tests; mock external services.
- All tests run against the same database instance — always create and destroy test data within your tests.

For detailed patterns including database state management helpers, see [Testing Guide](./docs/guides/testing.md).

## Pull Request Workflow

1. Create a feature branch from `main`.
2. Make your changes, ensuring tests pass and lint is clean.
3. Open a PR using the [PR template](./.github/pull_request_template.md) — it includes checklists for review, accessibility, and deploy steps.
4. PRs require review before merging. Tag the team in the `acf-head-start-eng` Slack channel if you need a reviewer.

## Questions?

Reach out in the `acf-head-start-eng` Slack channel or open a GitHub issue.
