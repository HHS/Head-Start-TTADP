### Running With Docker

For a full list of available yarn commands, see [here](#yarn-commands)

If you run into issues, check the [troubleshooting](#troubleshooting) section.

1. Install Docker. To check run `docker ps`.
2. Install Node, matching the version in [.nvmrc](.nvmrc).
3. Install Yarn `npm install -g yarn`
4. Install cross-env `npm install -g cross-env`
5. Copy `.env.example` to `.env`.
6. Change the `AUTH_CLIENT_ID` variable to value found in the team 1password account. If you don't have access to 1password, please ask in the acf-head-start-eng slack channel for access.
7. Run `yarn docker:restart`. This tears down any previous stack, removes compose-built images, rebuilds, then starts the **dev** profile (backend, frontend, postgres, redis) and runs `yarn db:migrate`. Seeds are **opt-in** to avoid duplicate data; see below.
8. Run `yarn docker:start` to start the dev profile without rebuilding.
   - The [frontend][frontend] runs on `localhost:3000`
   - The [backend][backend] runs on `localhost:8080`
9. Run `yarn docker:stop` to stop containers. Add `-v` (e.g., `docker compose down -v`) if you want to wipe volumes, including the node_modules/Yarn cache volumes.

**Profiles**

- `dev` (default via the scripts): backend, frontend, postgres, redis with bind mounts for fast iteration.
- `test`: adds test runners (unit/E2E); still reuses postgres/redis.
- `full`: starts all services (worker, minio, clamav, redoc, etc.).

Use `yarn docker:full` to bring up the full stack, or `yarn docker:test` to run the test profile (exits with the test status).

**Seeding**

- Default dev startup skips seeds to avoid duplicate-key errors when volumes persist.
- To seed once (after a fresh restart), run: `yarn docker:seed` (runs migrations + seeds in the db-init container).
- To force reseed on restart: `RUN_DB_SEED=true yarn docker:restart`.

**Proxy**

The frontend dev server proxies `/api` to the backend using `BACKEND_PROXY` (set in `.env` and defaulted in compose to `http://backend:8080`). If you run backend natively, set `BACKEND_PROXY=http://localhost:8080`.

**Service hostnames**

Docker compose pins service hosts internally (`POSTGRES_HOST=postgres`, `REDIS_HOST=redis`) regardless of values in your `.env`, so you don’t need to edit those for Docker use. If you run services natively, keep the localhost settings in `.env`.

**Node modules caching**

Compose creates named volumes for backend/frontend `node_modules` plus a shared Yarn cache volume. This speeds up installs inside containers while keeping your host `node_modules` untouched. To force a clean install, drop volumes with `docker compose down -v`.

**Notes:**

- The frontend [proxies requests](https://create-react-app.dev/docs/proxying-api-requests-in-development/) to paths it doesn't recognize to the backend.
- Api documentation uses [Redoc](https://github.com/Redocly/redoc) to serve documentation files. These files can be found in the [docs/openapi](docs/openapi) folder. Api documentation should be split into separate files when appropriate to prevent huge hard to grasp yaml files.

#### Troubleshooting

If you see errors that the version of nodejs is incorrect, rerun `yarn docker:restart`. The script tears down containers, removes compose-built images, rebuilds, and restarts the stack automatically.

When using Docker to run either the full app or the backend services, PostgreSQL (5432) and Redis (6379) are both configured to bind to their well-known ports. This will fail if any other instances of those services are already running on your machine.

On a Mac with Brew installed Docker, yarn commands may fail due to the absence of `docker-compose` (vs `docker compose`). To resolve:
`brew install docker-compose`

If you run into issues with file permissions when using docker bind mounts, check your Docker Desktop file sharing settings. Containers now run with Docker defaults; no UID/GID override is required.

**Apple Silicon & Chromium**

If you are using a newer Mac with the Apple Silicon chipset, puppeteer install fails with the message: `"The chromium binary is not available for arm64"`.

You will need to have chromium installed (you probably do not). The recommended installation method is to use brew: `brew install chromium --no-quarantine`

To ~/.zshrc (or your particular shell config) you'll need to add:

```sh
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
export PUPPETEER_EXECUTABLE_PATH=`which chromium`
```

Don't forget to run `source ~/.zshrc` or the equivalent after adding the above environment variables.

### Running Natively

You can also run build commands directly on your host (without docker). Make sure you install dependencies when changing execution method. You could see some odd errors if you install dependencies for docker and then run yarn commands directly on the host, especially if you are developing on windows. If you want to use the host yarn commands be sure to run `yarn deps:local` before any other yarn commands. Likewise if you want to use docker make sure you run `yarn docker:deps`.

You must also install and run minio locally to use the file upload functionality. Please comment out `S3_ENDPOINT=http://minio:9000` and uncomment `S3_ENDPOINT=http://localhost:9000` in your .env file.

### Precommit hooks

Our CI will fail if code is committed that doesn't pass our linter (eslint). This repository contains a pre-commit hook that runs eslint's built in "fix" command on all staged javascript files so that any autofixable errors will be fixed. The precommit hook, in .gihooks/pre-commit, also contains code to auto-format our terraform files, which you can read more about [here](terraform/README.md).

If you are not using your own custom pre-commit hooks:

- start from repo root directory
- make the pre-commit file executable:
  `chmod 755 .githooks/pre-commit`
- change your default hooks directory to [.githooks](.githooks):
  `git config core.hooksPath .githooks`

If you are already using git hooks, add the [.githooks/pre-commit](.githooks/pre-commit) contents to your hooks directory or current pre-commit hook. Remember to make the file executable.

### Import Production Data

Make sure you have access to all the necessary spaces on Cloud.gov

On a Mac

1. Login to cloud.gov: `cf login -a api.fr.cloud.gov  --sso`.
2. Download latest data: `bash ./bin/latest_backup.sh -d` (file will be placed in current directory).
3. Ensure you have `psql` (if not `brew install libpq`).
4. Ensure ttahub docker container is running.
5. Create bounce.sql in repo directory (see below)
6. Load data: `psql postgresql://username:password@127.0.0.1:5432/postgres < ./bounce.sql && psql postgresql://username:password@127.0.0.1:5432/ttasmarthub < db.sql` (Where username:password are replaced with credentials from .env and db.sql is the file you downloaded and unzipped).
7. Migrate data: `yarn docker:db:migrate`
8. Edit .env and change CURRENT_USER_ID= from 1 to the ID of a production user
9. Restart docker

_bounce.sql_

```sh
select pg_terminate_backend(pid) from pg_stat_activity where datname='ttasmarthub';
drop database ttasmarthub;
create database ttasmarthub;
```

On Windows
TBD
