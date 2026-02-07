# AGENTS.md

This file provides baseline guidance to all agentic coding assistants.
Instructions here may be overridden by other files or specific instructions from the user.

<!--
User Notes

* Personal Customization *
For personal instructions or modifications specific to Claude, create a `CLAUDE-mine.md` file in the repository root. That file is gitignored and will be automatically included by Claude Code.
-->

## Project Overview

The **Office of Head Start TTA Smart Hub** is a full-stack application for managing Training and Technical Assistance (TTA) activities for Head Start programs. The system tracks activity reports, goals, recipients, events, and collaboration across multiple regions.

## Documentation

### Guides
- `docs/guides/dev-setup.md`: Local development setup (Docker & native)
- `docs/guides/testing.md`: Testing strategy, patterns, and database state management
- `docs/guides/infrastructure.md`: Cloud.gov, CI/CD, deployment, and production operations
- `docs/guides/observability.md`: Monitoring, logging, and analytics
- `docs/guides/yarn-commands.md`: Quick reference for all yarn commands

### Reference
- `docs/tech-stack.md`: Technology versions and build variables
- `best_practices.md`: Code style, testing, and review standards
- `docs/adr/`: Architecture Decision Records
- `docs/openapi/`: OpenAPI/Swagger specs (served via Redoc at localhost:5003)

### Other Documentation
- `bin/README.md`: CLI scripts for backups and operations
- `src/tools/README.md`: Maintenance and data operation tools
- `automation/ci/scripts/README.md`: CI pipeline scripts
- `automation/db-backup/scripts/README.md`: Database backup scripts
- `deployment_config/README.md`: Deployment configuration

## Agent Working Notes
- Ask before starting work when acceptance criteria are missing, scope is ambiguous, or constraints are unclear.
- Pause and ask before making broad refactors or touching many files.
- When presenting choices to the user, provide a recommended option and your reasoning behind the choice

## Architecture

### App Structure

The codebase is a monorepo with three main components:

1. **Backend** (`/src`): Express API server
2. **Frontend** (`/frontend/src`): React SPA
3. **Worker** (`/src/worker.ts`): Background job processor

### Backend (`/src`)

**Key Directories:**
- `routes/`: API route handlers organized by domain (activityReports, goals, recipients, etc.)
- `services/`: Business logic layer
- `models/`: Sequelize database models
- `middleware/`: Express middleware (auth, sessions, logging, etc.)
- `policies/`: Authorization/access control logic
- `scopes/`: Sequelize query scopes for reusable filters
- `lib/`: Shared utilities and cron jobs
- `migrations/`: Database migrations
- `seeders/`: Database seed data
- `tools/`: CLI scripts for maintenance and data operations
- `widgets/`: Dashboard widget logic
- `workers/`: Background job implementations

**Key Patterns:**
- **Routes** define API endpoints and call **services** for business logic
- **Services** contain the core business logic and interact with **models**
- **Policies** enforce access control and authorization
- **Scopes** provide reusable query filters for Sequelize models
- Routes are wrapped in transaction middleware (`transactionWrapper.js`) when needed

### Frontend (`/frontend/src`)

**Key Directories:**
- `pages/`: Top-level page components (ActivityReport, RegionalDashboard, etc.)
- `components/`: Reusable UI components
- `fetchers/`: API client functions for backend communication
- `hooks/`: Custom React hooks
- `widgets/`: Dashboard widget components

**Key Patterns:**
- Uses React Hook Form for form management
- USWDS components via `@trussworks/react-uswds`
- Fetchers handle all API communication and return structured data
- Frontend proxies unknown paths to the backend API

### Worker (`/src/worker.ts`)

The worker processes background jobs from Redis queues using Bull:
- **Scan Queue**: File malware scanning (ClamAV)
- **Resource Queue**: Resource URL processing and metadata extraction
- **S3 Queue**: S3 file operations
- **Notification Queue**: Email notifications
- **Maintenance Queue**: Scheduled maintenance tasks

Workers use `throng` for horizontal scaling. Only instance 0 runs cron jobs.

### Database

- **ORM**: Sequelize v6
- **Migrations**: Stored in `/src/migrations`, run via `sequelize-cli`
- **Models**: Located in `/src/models`, follow Sequelize conventions
- Sequelize config: `.sequelizerc` and `config/config.js`
- For database testing patterns, see `docs/guides/testing.md`

### Authentication & Authorization

- OAuth2 integration with HSES (see ADR 0005)
- Session management via `express-session` + Redis
- Authorization handled by **policies** that check user permissions

### Background Jobs & Queues

- **Bull** queues backed by Redis for asynchronous processing
- Worker process handles file scanning, resource processing, notifications, etc.
- Cron jobs run maintenance tasks (only on instance 0 to avoid duplication)

### Monitoring Integration

- IT-AMS monitoring data is imported via CLI tools in `src/tools/`
- For monitoring architecture, see `docs/monitoring-technical-reference.md` and `docs/monitoring-integration-guide.md`
- For manual import steps, see `docs/guides/infrastructure.md`

### API Documentation

- OpenAPI/Swagger specs in `/docs/openapi`
- Served locally via Redoc at http://localhost:5003
- Split across multiple YAML files for maintainability

## Development Commands

See [Dev Setup](./docs/guides/dev-setup.md) and [Yarn Commands](./docs/guides/yarn-commands.md).

## Common Workflows

### Adding a New API Endpoint

1. Create/update route handler in `src/routes/<domain>/`
2. Add business logic in `src/services/<domain>.js`
3. Add authorization policy in `src/policies/` if needed
4. Write tests in same directory as implementation
5. Update OpenAPI spec in `docs/openapi/`

### Creating a New Migration

1. Run `yarn db:migrate:create -- --name add_new_field_to_table`
2. Edit the generated file in `src/migrations/`
3. Run `yarn db:migrate`

### CI Parity

CI runs build, lint, migrations/seed, backend/frontend tests, Playwright E2E (including API/util suites), Cucumber, and OWASP ZAP scans. Prefer Docker workflows when possible to match CI.

## Environment Variables

Key environment variables (see `.env.example`):
- `AUTH_CLIENT_ID`: OAuth client ID
- `POSTGRES_USERNAME`, `POSTGRES_PASSWORD`, `POSTGRES_DB`: Database credentials
- `CURRENT_USER_ID`: User ID for local development
- `NODE_ENV`: Environment (development, production, etc.)
- `S3_ENDPOINT`: Minio endpoint (http://localhost:9000 for native, http://minio:9000 for Docker)

## Deployment Environments

See [README.md](./README.md#environments) and [Infrastructure Guide](./docs/guides/infrastructure.md).

