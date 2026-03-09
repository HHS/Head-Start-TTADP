# Dev Setup

## Docker Setup

### Prerequisites

1. Install Docker Desktop (or Docker Engine + Compose v2).
2. Install Node using the version in `.nvmrc` (`22.22.0`).
3. Install [Taskfile](https://taskfile.dev/) for advanced workflows.
4. Copy `.env.example` to `.env` and set required values (notably `AUTH_CLIENT_ID`).
5. Confirm the tools are available (`task`, `node`, `docker`).

### Docker Workflows

Primary workflows (Yarn-first):

- Install frontend and backend dependencies: `yarn deps`
- Start core stack (`frontend`, `backend`, `db`, `redis`): `yarn docker:start`
- Start full stack (adds `worker`, `minio`, `mailpit`, `testingonly`): `yarn docker:start:full`
- Tail logs: `yarn docker:logs`
- Open backend shell: `yarn docker:shell:backend`
- Open frontend shell: `yarn docker:shell:frontend`
- Stop stack: `yarn docker:stop`
- Rebuild and restart stack: `yarn docker:refresh`
- Reset Docker resources for this repo: `yarn docker:reset`

Once the stack is running, open `http://localhost:3000`.
For testing commands, see [testing](./testing.md).

### Docker Compose Design

Local Docker development uses [`docker/compose/docker-compose.yml`](../../docker/compose/docker-compose.yml).
The baseline/dev services have no profile and start by default.
Additional services use the `fullstack` profile and are included by `yarn docker:start:full`.
Dynamic security scan uses [`docker/compose/dss.yml`](../../docker/compose/dss.yml) via `yarn docker:dss`.

The Docker stack uses bind mounts for source code and named volumes for dependencies/cache (for example `backend-node-modules`, `backend-yarn-cache`) to speed up rebuilds.

If you need internals, Yarn `docker:*` scripts are wrappers around Taskfile commands.

## Running Natively

You can also run locally without Docker.

1. Install dependencies: `yarn deps`
2. Start backend + frontend + worker watchers: `yarn start:stack:local`
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
4. Start the Docker stack: `yarn docker:start`
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

7. Run migrations: `yarn docker:db:migrate`
8. Set `CURRENT_USER_ID` in `.env` to a valid production user ID.
