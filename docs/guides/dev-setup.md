# Dev Setup

## Docker Setup

### Prerequisites

1. Install Docker Desktop (or Docker Engine + Compose v2).
2. Install Node using the version in `.nvmrc` (`22.22.0`).
3. Install [Taskfile](https://taskfile.dev/) 
3. Copy `.env.example` to `.env` and set required values (notably `AUTH_CLIENT_ID`).
4. Confirm the tools are available (`task`, `node`, `docker`)

### Docker Workflows

Primary workflows to get started (from `package.json`):

install frontend & backend node_modules
`yarn deps` (or `yarn deps:install` to regen the lockfiles)

build backend application
`yarn build` 

start the minimal docker-compose stack (frontend, backend, db, redis). ctrl-c to break
`yarn docker:start`

reattach to tail the container logs
`yarn docker:logs`

open a shell inside the container
`task stack-shell TARGET=backend`

stop the stack
`yarn docker:stop` 

if things have changed and you are not seeing the changes get picked up
`yarn docker:refresh` (best effort to force-rebuild on stack components)
`yarn docker:reset` (will delete ALL your ttahub docker images, volumes, etc)

check available commands
`task`

Once the stack is up and running you can go to [http](http://localhost:3000/) to interact with the site
You can also run tests against the Docker compose stack, refer to [testing](./testing.md)

### Docker Compose Design

There is one docker compose file used for local development [docker-compose.yml](/docker/compose/docker-compose.yml)
The baseline/dev services have no profile, and will be started automatically.
All other services have the profile "fullstack", and will be started when full is started.
If you want to run the stack with a local (non-docker) PG database, check `POSTGRES_HOST` in .env.example

Docker stack uses bind-mounts to the application repo, so most changes to files on your host will show up in the container automatically.  One exception is node_modules.  Due to the number and size of our node_modules, we use two named volumes to store them.  One volume acts as a global cache (ie `backend-yarn-cache`) while the other volumes acts as the current source of application modules attached to the container (ie `backend-node-modules`).  This means you can rebuild the app container and node_modules independently, and also if/when you need to change the modules, they can be transferred from the existing docker global cache rather than pulling from the internet each time.

Yarn commands are shortcuts into the Taskfile, which calls out into other scripts and docker commands.  Check the other yarn `docker:` commands or the Taskfile for further direction.

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
