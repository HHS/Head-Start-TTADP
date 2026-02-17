# Dev Setup

## Running With Docker (Recommended)

This project now uses `make` as the primary Docker interface.

### Prerequisites

1. Install Docker Desktop (or Docker Engine + Compose v2).
2. Install Node using the version in `.nvmrc` (`22.22.0`).
3. Copy `.env.example` to `.env` and set required values (notably `AUTH_CLIENT_ID`).
4. Confirm `make` is available: `make --version`.

### Core commands

- `make docker-start`
  - Stops any existing local project containers.
  - Starts the core stack: `db`, `redis`, `backend`, and `frontend`.
  - Worker tasks are only launched when you use `make docker-start-full`.
  - Runs migrations before attaching logs.
  - Runs attached (Ctrl+C to stop log streaming).
- `make docker-stop`
  - Force-stops all compose resources labeled for this repo.
- `make docker-reset`
  - Stops containers, removes project volumes, rebuilds images.
  - Runs migrations and seeders to reset to a deterministic baseline.
- `make docker-test`
  - Runs backend + frontend Jest suites in an isolated test compose stack.
  - Applies migrations and seed data before tests.
  - Cleans up test resources automatically.

### Optional helper commands

- `make docker-start-full`
  - Starts the core stack plus optional local services (`api-docs`, `minio`, `mailcatcher`, `redis-commander`) and the worker.
- `make docker-logs`
- `make docker-shell-backend`
- `make docker-shell-frontend`

### Service URLs

When running `make docker-start`:

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8080`
- Postgres: `localhost:5432`
- Redis: `localhost:6379`

When running `make docker-start-full`, also:

- API docs: `http://localhost:5003`
- Minio API: `http://localhost:9000`
- Minio Console: `http://localhost:9001`
- Mailcatcher UI: `http://localhost:1080`
- Redis Commander: `http://localhost:8081`

### Dependency updates and lockfiles

Containers auto-check lockfile hashes at startup and run `yarn install --frozen-lockfile` only when needed.

- Root lockfile changes refresh backend/worker dependencies.
- Frontend lockfile changes refresh frontend dependencies.
- No lockfile change means no reinstall.

## Running Natively

You can also run locally without Docker.

1. Install dependencies: `yarn deps:local`
2. Start services: `yarn start:local`
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
4. Start the Docker stack: `make docker-start`
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
