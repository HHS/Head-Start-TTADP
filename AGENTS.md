# AGENTS.md

This file provides baseline guidance to all agentic coding assistants.
Instructions here may be overridden by other files or specific instructions from the user.

<!--
User Notes

* Personal Customization *
For personal instructions or modifications specific to Claude, create a `CLAUDE-mine.md` file in the repository root. That file is gitignored and will be automatically included by Claude Code.
-->

## Project Overview

Office of Head Start TTA Smart Hub — full-stack monorepo (Express API, React SPA, Bull/Redis worker) for managing Training and Technical Assistance activities across Head Start programs.

## Working Rules
- Ask before starting work when acceptance criteria are missing, scope is ambiguous, or constraints are unclear.
- Pause and ask before making broad refactors or touching many files.
- When presenting choices, provide a recommended option with reasoning.
- Ensure changes pass lint checks after work is complete.
- Follow coding standards in `best_practices.md`.

## Commands

**Backend:**
- `yarn test` — build then run backend tests (`jest --runInBand`)
- `yarn test:ci` — backend tests via CI script (`./bin/test-backend-ci`)
- `yarn lint` — eslint backend (`src/`)
- `yarn lint:fix` — eslint autofix backend

**Frontend:**
- `cd frontend && yarn test --watchAll=false` — run frontend tests (Jest, requires `TZ=America/New_York`)
- `cd frontend && yarn lint` — eslint frontend
- `cd frontend && yarn lint:fix` — eslint autofix frontend

**Database:**
- `yarn db:migrate` — run migrations (also runs logical data model update)
- `yarn db:migrate:undo` — revert last migration
- `yarn db:migrate:create -- --name verb_object_table` — generate new migration file
- `yarn db:seed` / `yarn db:seed:undo` — seed or unseed data

**Docker (matches CI more closely):**
- `yarn docker:start` — full stack
- `yarn docker:test:be` — backend tests in Docker
- `yarn docker:db:migrate` — migrations in Docker

## Architecture at a Glance

Three entry points: backend (`/src`), frontend (`/frontend/src`), worker (`/src/worker.ts`).

**Backend layered pattern:** Routes → Services → Models.
- `routes/`: API endpoints organized by domain. Call services, never contain business logic directly.
- `services/`: Business logic. Interact with models and handle associated-data updates.
- `models/`: Sequelize database models. Subdirectories for hooks and model validation schemas
- `policies/`: Authorization and access control. Routes check policies before proceeding.
- `scopes/`: Reusable Sequelize query filters.
- `middleware/`: Express middleware (auth, sessions, logging). Routes use `transactionWrapper.js` when needed.
- `migrations/`, `seeders/`, `lib/`, `tools/`, `widgets/`, `workers/`: Supporting directories.

**Frontend:** `pages/` → `components/` with `fetchers/` for API calls and `hooks/` for shared logic. Uses React Hook Form and `@trussworks/react-uswds`.

**Worker:** Bull queues backed by Redis — Scan (ClamAV), Resource, S3, Notification, Maintenance. Uses `throng` for horizontal scaling.

**Auth:** OAuth2 via HSES, session management with `express-session` + Redis, authorization enforced by policies.

**Database:** Sequelize v6, config at `.sequelizerc` and `config/config.js`.

## Non-obvious Architecture
- **Only worker instance 0 runs cron jobs** — never duplicate cron registration.
- `yarn db:migrate` also runs the logical data model CLI (`yarn ldm`) — don't skip this.
- Frontend proxies `/api` requests to the backend via Vite dev server proxy config.

## Traps to Avoid

### Sequelize enum arrays
Don't use them. Use a joined table instead — there is a Sequelize bug that intermittently returns the wrong data type from enum arrays.

### Sequelize hooks that write data
Never do database writes in model hooks. Validation in hooks (e.g., `beforeUpdate`) is fine. For updating associated data, do it explicitly in services. Hooks that write obfuscate operations and lead to unexpected states.

### SQL injection in filters
Filters are derived from URLs. `sequelize.escape` alone is insufficient — independently validate expected types (e.g., confirm all region IDs are numbers) before using them in queries.

### WYSIWYG + autosave interaction
Disable autosave on forms containing React Draft WYSIWYG editors. Autosave triggers `reset()` which destroys cursor position and in-progress text. See `frontend/src/utils/formRichTextEditorHelper.js` for the guard pattern.

### Shared test database
All tests run against the same database instance. Never rely on seed data — create and destroy test data within each test using `beforeAll`/`afterAll`. Use transactions where appropriate and `Promise.all()` for parallel async setup.

### Avoid raw SQL
Use Sequelize scopes and models. Raw SQL should be a last resort.

## Common Workflows

### Adding a New API Endpoint
1. Create/update route handler in `src/routes/<domain>/`
2. Add business logic in `src/services/<domain>.js`
3. Add authorization policy in `src/policies/` if needed
4. Write tests alongside implementation
5. Update OpenAPI spec in `docs/openapi/`

### Creating a New Migration
1. Run `yarn db:migrate:create -- --name add_new_field_to_table`
2. Edit the generated file in `src/migrations/`
3. Run `yarn db:migrate`

## Documentation
- `docs/guides/testing.md`: Testing strategy and database state management
- `docs/guides/dev-setup.md`: Local development setup
- `docs/guides/infrastructure.md`: Cloud.gov, CI/CD, deployment
- `docs/adr/`: Architecture Decision Records
- `docs/openapi/`: OpenAPI specs (served via Redoc at localhost:5003)
- `best_practices.md`: Code authoring and review standards
