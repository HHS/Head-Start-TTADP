# Command Reference

## Native host commands

| Description                                     | Command                                   |
| ----------------------------------------------- | ----------------------------------------- |
| Install dependencies (CI-style frozen lockfile) | `yarn deps`                               |
| Install dependencies for local development      | `yarn deps`                               |
| Audit dependencies                              | `yarn deps:audit`                         |
| Start backend + frontend + worker locally       | `yarn start:stack:local`                  |
| Start backend only (built output)               | `yarn start`                              |
| Start backend dev watcher                       | `yarn server`                             |
| Start worker dev watcher                        | `yarn start:worker:watch`                 |
| Start frontend dev server                       | `yarn start:fe`                           |
| Run backend tests                               | `yarn test`                               |
| Run backend + frontend tests                    | `yarn test:all`                           |
| Run e2e tests                                   | `yarn test:e2e`                           |
| Run API tests                                   | `yarn test:e2e:api`                       |
| Run utils tests                                 | `yarn test:e2e:utils`                     |
| Run BDD tests                                   | `yarn test:bdd`                           |
| Run backend lint                                | `yarn lint`                               |
| Run backend lint (CI formatter)                 | `yarn lint:ci`                            |
| Run backend + frontend lint                     | `yarn lint:all`                           |
| Auto-fix backend lint issues                    | `yarn lint:fix`                           |
| Auto-fix backend + frontend lint issues         | `yarn lint:fix:all`                       |
| Run backend migrations                          | `yarn db:migrate`                         |
| Run backend seeders                             | `yarn db:seed`                            |
| Run backend seeders (local audit-safe prep)     | `yarn db:seed:local`                      |
| Run logical data model                          | `yarn db:ldm`                             |
| Create a new migration                          | `yarn db:migrate:create -- --name <name>` |
| Build backend TypeScript                        | `yarn build`                              |
| Build frontend production bundle                | `yarn --cwd frontend build`               |

## Preferred Docker commands (Task)

| Description                                                                                                   | Command                            |
| ------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| Start core local stack (`db`, `redis`, `backend`, `frontend`)                                                 | `task stack-up`                    |
| Start full local stack (`db`, `redis`, `backend`, `frontend`, `worker`, `minio`, `mailpit`, `testingonly`) | `task stack-up-full`               |
| Stop any running repo Docker resources                                                                        | `task stack-down`                  |
| Rebuild assets, reinstall deps, and restart the core stack                                                    | `task refresh`                     |
| Reset Docker state (remove volumes, rebuild, migrate, seed)                                                   | `task reset`                       |
| Run backend + frontend Jest in isolated Docker test stack                                                     | `task test-be` and `task test-fe` |
| Run local dynamic security scan (OWASP ZAP)                                                                   | `task test-dss`                    |
| Run e2e app/api/utils suites                                                                                  | `task test-e2e`                    |
| Follow logs for the selected stack                                                                            | `task stack-logs`                  |
| Open shell in backend container                                                                               | `task stack-shell TARGET=backend`  |
| Open shell in frontend container                                                                              | `task stack-shell TARGET=frontend` |
| Execute command in running container                                                                          | `task stack-exec TARGET=backend -- <cmd>` |
| Run one-off command in a new container                                                                        | `task stack-run TARGET=backend -- <cmd>` |
| Run dev stack in debug mode (inspector on `9229`)                                                             | `DEV_DEBUG=true task stack-up`     |
| Run dev stack against host Postgres                                                                           | `USE_LOCAL_POSTGRES=true task stack-up` |

## Compose context mapping

| Context | Project name | Compose file(s) | Entrypoint command(s) |
| --- | --- | --- | --- |
| Dev core | `ttahub-dev` | `docker/compose/dev.yml` | `task stack-up` |
| Full local stack | `ttahub-full` | `docker/compose/test.yml` + `docker/compose/test.e2e.yml` + `--profile e2e` | `task stack-up-full` |
| Dev debug | `ttahub-dev` | `docker/compose/dev.yml` + `docker/compose/dev.debug.yml` | `DEV_DEBUG=true task stack-up` |
| Dev + local Postgres | `ttahub-dev` | `docker/compose/dev.yml` + `docker/compose/dev.local-postgres.yml` | `USE_LOCAL_POSTGRES=true task stack-up` |
| Jest tests | `ttahub-test` | `docker/compose/test.yml` | `task test-be`, `task test-fe` |
| DSS | `ttahub-dss` | `docker/compose/dss.yml` | `task test-dss` |
| E2E | `ttahub-e2e` | `docker/compose/test.yml` + `docker/compose/test.e2e.yml` | `task test-e2e` |

## Yarn compatibility aliases

These Yarn scripts remain available as convenience wrappers:

- `yarn docker:start` -> `task stack-up`
- `yarn docker:stop` -> `task stack-down`
- `yarn docker:refresh` -> `task refresh`
- `yarn docker:reset` -> `task reset`
- `yarn docker:test` -> `task test-be && task test-fe`
- `yarn docker:test:be` -> `task test-be`
- `yarn docker:test:fe` -> `task test-fe`
- `yarn docker:dss` -> `task test-dss`
- `yarn docker:e2e` -> `task test-e2e`
- `yarn docker:logs` -> `task stack-logs`

## CLI tools

CLI tools use `bin/run-tool` for consistent execution:

- **Build mode** (default): `yarn cli:<name>` — runs via `node ./build/server/...`
- **Local mode**: `yarn cli:<name>:local` — runs via `tsx ...`

| Description                          | Command                                         |
| ------------------------------------ | ----------------------------------------------- |
| Change report status                 | `yarn cli:change-report-status`                 |
| Create goals (pilot)                 | `yarn cli:create-goals`                         |
| Create monitoring goals              | `yarn cli:create-monitoring-goals`              |
| Bootstrap admin user                 | `yarn cli:db-bootstrap-admin`                   |
| Database maintenance                 | `yarn cli:db-maintenance`                       |
| Import goals                         | `yarn cli:import-goals`                         |
| Import HSES data                     | `yarn cli:import-hses`                          |
| Import reports                       | `yarn cli:import-reports`                       |
| Import system data                   | `yarn cli:import-system`                        |
| Process data                         | `yarn cli:process-data`                         |
| Queue exercise (live)                | `yarn cli:queue-exercise:live`                  |
| Reconcile legacy reports             | `yarn cli:reconcile-legacy`                     |
| Restore topics                       | `yarn cli:restore-topics`                       |
| Update completed event report pilots | `yarn cli:update-completed-event-report-pilots` |
| Populate legacy resource titles      | `yarn cli:populate-legacy-resource-titles`      |

## Bash helpers

- `bin/run-tool [--local] <src-path> [args...]` — Run a src/tools script in build mode (node) or local mode (tsx)
- `bin/ci-env <command...>` — Wrap a command with CI database credentials (POSTGRES_USERNAME, POSTGRES_DB)
- `bin/test-backend-ci` — CI test splitting logic for backend tests
- `bin/build-coverage-report` — Multi-target coverage report builder
