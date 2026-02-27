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
- Prefer creating new backend files as TypeScript.
- Ensure changes pass lint checks after work is complete.

## Commands

**Backend:**
- `yarn test` — build then run backend tests (`jest --runInBand`)
- `yarn test:ci` — backend tests via CI script (`./bin/test-backend-ci`)
- `yarn lint` — eslint backend (`src/`)
- `yarn lint:fix` — eslint autofix backend

**Frontend:**
- `cd frontend && yarn test --watchAll=false` — run frontend tests (Jest via craco, requires `TZ=America/New_York`)
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

## Non-obvious Architecture
- Three entry points: backend (`/src`), frontend (`/frontend/src`), worker (`/src/worker.ts`).
- Worker uses `throng` for horizontal scaling; **only instance 0 runs cron jobs** — never duplicate cron registration.
- Sequelize config lives at `.sequelizerc` and `config/config.js` (not the default location).
- `yarn db:migrate` also runs the logical data model CLI (`yarn ldm`) — don't skip this.
- Frontend proxies unknown paths to the backend API via CRA proxy config.

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

## Migrations
- Always include `down` logic so migrations are reversible.
- Name migrations clearly: `verb_object_table` (e.g., `add_status_to_activity_reports`).
- Prefer transactions for multi-step writes within migrations.

## Frontend Conventions
- Use USWDS utility classes instead of authoring new CSS. Prefer vanilla CSS over SCSS.
- CSS nesting: one level maximum.
- Use the `useFetch` hook instead of manual `useEffect` + `useState` for data fetching.
- Use `@trussworks/react-uswds` components.

## Release Hygiene
- Update OpenAPI specs (`docs/openapi/`) when API shape changes.
- Update `docs/adr/` if an architecture decision is introduced or changed.
