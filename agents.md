# AGENTS.md

This file provides guidance to all agentic coding assistants.

## Project Overview

The **Office of Head Start TTA Smart Hub** is a full-stack application for managing Training and Technical Assistance (TTA) activities for Head Start programs. The system tracks activity reports, goals, recipients, events, and collaboration across multiple regions.

## Tech Stack

- **Backend**: Node.js, Express, TypeScript
- **Frontend**: React, USWDS (U.S. Web Design System)
- **Database**: PostgreSQL via Sequelize ORM
- **Queue**: Redis + Bull for background job processing
- **Testing**: Jest (backend & frontend), Playwright (E2E), Cucumber (BDD)
- **Infrastructure**: Cloud Foundry, Cloud.gov, CircleCI, Docker for local development

## Code Review Philosophy
- Start with a brief summary of the modifications and context
- Focus on actionable and specific feedback
- Be concise: one sentence per comment when possible
- Add more context and explain why only if the impact is not obvious
- Unless instructed otherwise, focus on correctness, security, operability and performance
- Offer suggestions which would lead to significant improvements

## Code Review Focus Areas

### Correctness
- Typos
- Logic errors
- Race conditions
- Resource leaks
- Off-by-one errors
- Missing error handling
- Boundary conditions

### Security
- Check for hardcoded secrets, API keys, or credentials
- Look for SQL or data injection issues and XSS vulnerabilities
- Verify proper input validation and sanitization
- Review authentication and authorization logic
- Data privacy or PII leakage risks

### Performance
- Spot inefficient loops and algorithmic issues
- Check for memory leaks and resource cleanup
- Highlight significant performance improvement opportunities

## Response Format

When you identify an issue, provide a single concise sentence that states the problem and the suggested fix; add a second sentence and explain why if the impact is not obvious.

Example:
```
This could panic if the vector is empty; use `.get(0)` or add a length check before indexing.
```


## Development Commands

### Local Development with Docker

**Initial Setup:**
```bash
yarn docker:reset  # Build, install deps, run migrations & seeders
yarn docker:start  # Start all services
yarn docker:stop   # Stop and remove containers
```

**Running Services:**
- Frontend: http://localhost:3000
- Backend: http://localhost:8080
- API Docs (Redoc): http://localhost:5003
- Minio (S3): http://localhost:9000

### Native Development (without Docker)

```bash
yarn deps:local        # Install dependencies locally
yarn start:local       # Start backend server, frontend, and worker
yarn server            # Backend only (with hot reload)
yarn worker            # Worker only (with hot reload)
yarn client            # Frontend only
```

### Testing

**Backend:**
```bash
yarn test                    # Run all backend tests (requires yarn build first)
yarn test build/server/src/path/to/file.test.js  # Run single test file
yarn docker:test backend     # Run backend tests in Docker
```

**Frontend:**
```bash
yarn --cwd frontend test                    # Run frontend tests
yarn --cwd frontend test -- SomeComponent   # Run specific test
yarn docker:test frontend                   # Run frontend tests in Docker
```

**All Tests:**
```bash
yarn test:all        # Run both backend and frontend tests
yarn docker:test     # Run all tests in Docker
```

**E2E & Integration:**
```bash
yarn e2e             # Playwright E2E tests
yarn e2e:api         # Playwright API tests
yarn cucumber        # Cucumber BDD tests
```

### Linting

```bash
yarn lint:all        # Lint backend and frontend
yarn lint:fix:all    # Auto-fix linting issues
yarn lint            # Backend only
yarn --cwd frontend lint  # Frontend only
```

### Database Operations

**Migrations:**
```bash
yarn db:migrate              # Run migrations
yarn db:migrate:undo         # Undo last migration
yarn db:migrate:create       # Create new migration
yarn docker:db:migrate       # Run migrations in Docker
```

**Seeders:**
```bash
yarn db:seed                 # Run all seeders
yarn db:seed:undo            # Undo all seeders
```

**Other DB Commands:**
```bash
yarn ldm                     # Run Logical Data Model CLI
yarn import:system           # Import system data
```

### Building

```bash
yarn build                   # Build backend TypeScript
yarn --cwd frontend build    # Build frontend for production
```

## Architecture

### Application Structure

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

**Important:**
- All tests run against the same database instance in parallel
- Always create and destroy test data within tests to avoid conflicts
- Use transactions where appropriate to maintain data integrity

### Authentication & Authorization

- OAuth2 integration with HSES (see ADR 0005)
- Session management via `express-session` + Redis
- Authorization handled by **policies** that check user permissions

### Background Jobs & Queues

- **Bull** queues backed by Redis for asynchronous processing
- Worker process handles file scanning, resource processing, notifications, etc.
- Cron jobs run maintenance tasks (only on instance 0 to avoid duplication)

### API Documentation

- OpenAPI/Swagger specs in `/docs/openapi`
- Served via Redoc at http://localhost:5003
- Split across multiple YAML files for maintainability

## Testing Conventions

### Coverage Requirements

Backend coverage thresholds (configured in package.json):
- Statements: 90%
- Functions: 88%
- Branches: 80%
- Lines: 90%

### Test Patterns

1. **Create test data in `beforeAll`/`beforeEach`**, destroy in `afterAll`/`afterEach`
2. **Use `Promise.all()`** for multiple async operations in setup
3. **Mock external dependencies** when database interaction isn't required
4. **Avoid relying on seed data** - create what you need in each test
5. Files matching `*CLI.js` are excluded from coverage (shell scripts)

### Running Single Tests

**Backend:**
```bash
# Build first, then run specific test
yarn build
yarn test build/server/src/services/activityReports.test.js
```

**Frontend:**
```bash
yarn --cwd frontend test -- ActivityReport
```

## Important Files & Conventions

- `.env`: Environment configuration (copy from `.env.example`)
- `AUTH_CLIENT_ID`: Required from team 1Password for OAuth (ask in acf-head-start-eng Slack)
- Pre-commit hooks in `.githooks/pre-commit` run ESLint auto-fix on staged files
- ADRs (Architecture Decision Records) in `/docs/adr` document key technical decisions

## Common Workflows

### Creating a New Migration

```bash
yarn db:migrate:create -- --name add_new_field_to_table
# Edit the generated file in src/migrations
yarn db:migrate
```

### Adding a New API Endpoint

1. Create/update route handler in `src/routes/<domain>/`
2. Add business logic in `src/services/<domain>.js`
3. Add authorization policy in `src/policies/` if needed
4. Write tests in same directory as implementation
5. Update OpenAPI spec in `docs/openapi/`

### Debugging

- Backend server debug: `yarn server:debug` (attaches debugger on port 9229)
- Check logs in Docker: `docker compose logs -f backend`
- Frontend proxies API requests to backend automatically

## Environment Variables

Key environment variables (see `.env.example`):
- `AUTH_CLIENT_ID`: OAuth client ID
- `POSTGRES_USERNAME`, `POSTGRES_PASSWORD`, `POSTGRES_DB`: Database credentials
- `CURRENT_USER_ID`: User ID for local development
- `NODE_ENV`: Environment (development, production, etc.)
- `S3_ENDPOINT`: Minio endpoint (http://localhost:9000 for native, http://minio:9000 for Docker)

## Deployment Environments

| Environment | URL |
|------------|-----|
| Production | https://ttahub.ohs.acf.hhs.gov |
| Staging | https://tta-smarthub-staging.app.cloud.gov/ |
| Dev (Red/Blue/Green/Gold/Pink) | https://tta-smarthub-dev-{color}.app.cloud.gov/ |

Infrastructure is managed via Terraform and deployed to Cloud.gov (see `/docs/guides/infrastructure.md`).
