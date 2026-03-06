# Dev Setup

## Running With Docker (Recommended)

### Prerequisites

1. Install Docker Desktop (or Docker Engine + Compose v2).
2. Install Node using the version in `.nvmrc` (`22.22.0`).
3. Install [Taskfile](https://taskfile.dev/) 
3. Copy `.env.example` to `.env` and set required values (notably `AUTH_CLIENT_ID`).
4. Confirm the tools are available (`task`, `node`, `docker`)

### Compose workflow model

There 
yarn docker:start

task stack-up # (or ) bring up the dev stack (ctrl-c to stop)
task stack-down # (or yarn docker:stop) bring it down explicitly
task refresh # (or yarn docker:refresh) rebuild everything except node_module volumes

| Stack | Primary tasks | Compose project (`-p`) | Compose file(s) |
| --- | --- | --- | --- |
| Dev core (fronted, backend, db, redis) | `task stack-up` | `ttahub-dev` | `docker/compose/dev.yml` |
| Dev debug mode | `DEV_DEBUG=true task stack-up` | `ttahub-dev` | `docker/compose/dev.yml` + `docker/compose/dev.debug.yml` |
| Full local stack (app + worker + minio + mailpit + testingonly) | `task stack-up-full` | `ttahub-full` | `docker/compose/test.yml` + `docker/compose/test.e2e.yml` + `--profile e2e` |
| Run backend tests | `task test-be`, `task test-fe` | `ttahub-test` | `docker/compose/test.yml` |
| Run frontend tests | `task test-be`, `task test-fe` | `ttahub-test` | `docker/compose/test.yml` |
| Run E2E tests | `task test-e2e` | `ttahub-e2e` | `docker/compose/test.yml` + `docker/compose/test.e2e.yml` |
| Dev + local Postgres | `USE_LOCAL_POSTGRES=true task stack-up` | `ttahub-dev` | `docker/compose/dev.yml` + `docker/compose/dev.local-postgres.yml` |
| DSS scan stack | `task test-dss` | `ttahub-dss` | `docker/compose/dss.yml` |

Notes:
- The task wrappers set `TTA_DOCKER_LABEL=com.ttahub.project=head-start-ttadp` so repo cleanup scripts can stop/remove only this repo's Docker resources.
- `task stack-down` and `task reset` intentionally clean up by label across all local stack contexts (`dev`, `full`, `test`, `dss`, `e2e`).

### Shared dependency volumes

Compose workflows share dependency/cache volumes across stack contexts to avoid reinstalling dependencies from scratch:

- `ttahub-backend-node-modules`
- `ttahub-frontend-node-modules`
- `ttahub-backend-yarn-cache`
- `ttahub-frontend-yarn-cache`

These are configured as `external: true` in compose files. If they do not exist yet, create them once:

```bash
docker volume create ttahub-backend-node-modules
docker volume create ttahub-frontend-node-modules
docker volume create ttahub-backend-yarn-cache
docker volume create ttahub-frontend-yarn-cache
```

### Core commands

- `task stack-up`
  - Stops any existing local project containers.
  - Starts the core stack: `db`, `redis`, `backend`, and `frontend`.
  - Runs migrations before attaching logs.
  - Runs attached (Ctrl+C to stop log streaming).
- `task stack-up-full`
  - Stops any existing local project containers.
  - Starts `db` and `redis`, runs migrations/seed initialization, then starts and attaches:
    `backend`, `frontend`, `worker`, `minio`, `mailpit`, and `testingonly`.
  - Runs attached (Ctrl+C to stop log streaming).
- `task stack-down`
  - Force-stops all compose resources labeled for this repo.
- `task reset`
  - Stops containers, removes project volumes, rebuilds images.
  - Runs migrations and seeders to reset to a deterministic baseline.
- `task refresh`
  - Rebuilds backend/frontend assets, reinstalls dependencies, and restarts the core dev stack.
  - Good first step after switching branches with large dependency or build-output drift.
- `task test-be` and `task test-fe`
  - Run backend/frontend Jest suites in an isolated test compose stack.
  - Applies migrations and seed data before tests.
  - Cleans up test resources automatically.

### Optional helper commands

- `task stack-logs`
- `task stack-shell TARGET=backend`
- `task stack-shell TARGET=frontend`

### Optional environment toggles

- `USE_LOCAL_POSTGRES=true task stack-up`
  - Runs non-test Docker stacks against a local Postgres host (`LOCAL_POSTGRES_HOST`, default `host.docker.internal`) instead of the in-compose db service.
- `DEV_DEBUG=true task stack-up`
  - Runs backend in debug mode and exposes Node inspector on port `9229`.
- Toggles can be combined:
  - `USE_LOCAL_POSTGRES=true DEV_DEBUG=true task stack-up`

### Running raw `docker compose` commands safely

Use Task commands by default. If you need raw compose for debugging, use the same project names/files as Taskfile:

```bash
# Dev stack
docker compose -p ttahub-dev -f docker/compose/dev.yml ps

# Test stack
docker compose -p ttahub-test -f docker/compose/test.yml ps

# DSS stack
docker compose -p ttahub-dss -f docker/compose/dss.yml ps

# E2E stack
docker compose -p ttahub-e2e -f docker/compose/test.yml -f docker/compose/test.e2e.yml --profile e2e ps

# Full local stack
docker compose -p ttahub-full -f docker/compose/test.yml -f docker/compose/test.e2e.yml --profile e2e ps
```

Also keep `.env` present for compose workflows that include `env_file` entries (`dev`, `test`, `e2e`):

```bash
cp .env.example .env
```

### Common compose failures

- `env file .../.env not found`
  - Create the file from example: `cp .env.example .env`
- `external volume "ttahub-backend-node-modules" not found` (or similar `ttahub-*` dependency volume)
  - Create missing shared dependency volumes with `docker volume create <volume-name>`
- Volume ownership/recreate prompts (for old local definitions)
  - Ensure you are on current compose files where dependency/cache volumes are `external: true`
  - If needed, remove stale conflicting local volumes, then re-run `task stack-up`

### Service URLs

When running `task stack-up`:

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8080`
- Postgres: `localhost:5432`
- Redis: `localhost:6379`

When running `task stack-up-full`:

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8080`
- Testing-only API: `http://localhost:9999/testingonly`
- Mailpit UI: `http://localhost:8025`
- Minio Console: `http://localhost:9001`
- Postgres: `localhost:5432`
- Redis: `localhost:6379`

### Dependency updates and lockfiles

Containers auto-check lockfile hashes at startup and run `yarn install --frozen-lockfile` only when needed.

- Root lockfile changes refresh backend/worker dependencies.
- Frontend lockfile changes refresh frontend dependencies.
- No lockfile change means no reinstall.

## Running Natively

You can also run locally without Docker.

1. Install dependencies: `yarn deps`
2. Start services: `yarn start:stack:local`
3. For file upload support, run Minio locally and use `S3_ENDPOINT=http://localhost:9000` in `.env`.

## Precommit hooks

Our CI will fail if code is committed that does not pass linting. This repo includes a pre-commit hook in `.githooks/pre-commit`.

If you are not using custom hooks:

1. `chmod 755 .githooks/pre-commit`
2. `git config core.hooksPath .githooks`

## Import Production Data

Make sure you have access to cloud.gov spaces and required credentials.

On macOS:

1. `cf login -a api.fr.cloud.gov --sso`
2. `bash ./bin/latest_backup.sh -d`
3. Ensure `psql` is installed.
4. Start the Docker stack: `task stack-up`
5. Create `bounce.sql` in repo root:

```sql
select pg_terminate_backend(pid) from pg_stat_activity where datname='ttasmarthub';
drop database ttasmarthub;
create database ttasmarthub;
```

6. Load backup data (replace credentials from `.env`):

```bash
psql postgresql://username:password@127.0.0.1:5432/postgres < ./bounce.sql
psql postgresql://username:password@127.0.0.1:5432/ttasmarthub < db.sql
```

7. Run migrations: `docker compose -p ttahub-dev -f docker/compose/dev.yml run --rm backend yarn db:migrate`
8. Set `CURRENT_USER_ID` in `.env` to a valid production user ID.
