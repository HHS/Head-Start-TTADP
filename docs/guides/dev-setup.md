# Dev Setup

## Running With Docker

For a full list of available yarn commands, see [yarn-commands.md](./yarn-commands.md)

If you run into issues, check the [troubleshooting](#troubleshooting) section.

1. Install Docker. To check run `docker ps`.
2. Install Node, matching the version in `.nvmrc` (in the repo root).
3. Install Yarn `npm install -g yarn`
4. Install cross-env `npm install -g cross-env`
5. Copy `.env.example` to `.env`.
6. Change the `AUTH_CLIENT_ID` variable to value found in the team 1password account. If you don't have access to 1password, please ask in the acf-head-start-eng slack channel for access.
7. Run `yarn docker:reset`. This builds the frontend and backend, installs dependencies, then runs database migrations and seeders.
8. Run `yarn docker:start` to start the application.
   - The frontend will run on http://localhost:3000
   - The backend will run on http://localhost:8080
   - API documentation will run on http://localhost:5003
   - Minio (S3-compatible file storage) will run on http://localhost:9000
9. Run `yarn docker:stop` to stop the servers and remove the docker containers.

**Notes:**

- The frontend [proxies requests](https://create-react-app.dev/docs/proxying-api-requests-in-development/) to paths it doesn't recognize to the backend.
- Api documentation uses [Redoc](https://github.com/Redocly/redoc) to serve documentation files. These files can be found in the [docs/openapi](../../docs/openapi) folder. Api documentation should be split into separate files when appropriate to prevent huge hard to grasp yaml files.

### Troubleshooting

#### Outdated Node.js containers

If you see errors that the version of Node.js is incorrect, you may have older versions of the containers built. Delete those images and rerun `yarn docker:reset`.

#### Port conflicts

When using Docker to run either the full app or the backend services, PostgreSQL (5432) and Redis (6379) are both configured to bind to their well-known ports. This will fail if any other instances of those services are already running on your machine.

#### Missing `docker-compose` on Mac

On a Mac with Brew-installed Docker, yarn commands may fail due to the absence of `docker-compose` (vs `docker compose`). To resolve: `brew install docker-compose`

#### File permission issues

If you run into issues with file permissions when using Docker, try changing the CURRENT_USER values in your `.env`. Run `id -u` and `id -g` to get your current user uid/gid.

#### Apple Silicon & Chromium

If you are using a newer Mac with the Apple Silicon chipset, Puppeteer install fails with the message: `"The chromium binary is not available for arm64"`.

You will need to have Chromium installed (you probably do not). The recommended installation method is to use brew: `brew install chromium --no-quarantine`

To `~/.zshrc` (or your particular shell config) you'll need to add:

```sh
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
export PUPPETEER_EXECUTABLE_PATH=`which chromium`
```

Don't forget to run `source ~/.zshrc` or the equivalent after adding the above environment variables.

#### Playwright setup

If running E2E tests for the first time, install the required browsers:

```sh
npx playwright install
```

## Running Natively

You can also run build commands directly on your host (without docker). Make sure you install dependencies when changing execution method. You could see some odd errors if you install dependencies for docker and then run yarn commands directly on the host, especially if you are developing on windows. If you want to use the host yarn commands be sure to run `yarn deps:local` before any other yarn commands. Likewise if you want to use docker make sure you run `yarn docker:deps`.

You must also install and run minio locally to use the file upload functionality. Please comment out `S3_ENDPOINT=http://minio:9000` and uncomment `S3_ENDPOINT=http://localhost:9000` in your .env file.

## Precommit hooks

Our CI will fail if code is committed that doesn't pass our linter (Biome). This repository contains a pre-commit hook that runs Biome's autofix check on all staged JavaScript and TypeScript files so that any autofixable issues will be fixed. The pre-commit hook, in `.githooks/pre-commit`, also contains code to auto-format our terraform files, which you can read more about [here](terraform/README.md).

If you are not using your own custom pre-commit hooks:

- start from repo root directory
- make the pre-commit file executable:
  `chmod 755 .githooks/pre-commit`
- change your default hooks directory to [.githooks](../../.githooks):
  `git config core.hooksPath .githooks`

If you are already using git hooks, add the [.githooks/pre-commit](../../.githooks/pre-commit) contents to your hooks directory or current pre-commit hook. Remember to make the file executable.

## Import Production Data

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

> Windows setup instructions have not yet been documented. Contributions welcome — please open a PR if you get this working.
