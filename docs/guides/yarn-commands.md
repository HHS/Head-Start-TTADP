# Command Reference

This guide is the source of truth for local command usage. For common operations, prefer Yarn scripts.

## Common Yarn Commands (Recommended)

| Description | Command |
| --- | --- |
| Install dependencies (frozen lockfile) | `yarn deps` |
| Install dependencies (non-frozen) | `yarn deps:install` |
| Audit dependencies | `yarn deps:audit` |
| Start backend dev watcher | `yarn server` |
| Start frontend dev server | `yarn start:fe` |
| Start worker dev watcher | `yarn start:worker:watch` |
| Run frontend tests | `yarn --cwd frontend test` |
| Run frontend tests (CI coverage) | `yarn --cwd frontend test:ci` |
| Run frontend lint | `yarn --cwd frontend lint` |
| Start backend + frontend + worker locally | `yarn start:stack:local` |
| Start backend from build output | `yarn start:be` |
| Start backend with debugger | `yarn start:debug` |
| Run backend tests | `yarn test` |
| Run backend tests (CI split script) | `yarn test:ci` |
| Run backend + frontend CI suites | `yarn test:all` |
| Run Playwright e2e tests | `yarn test:e2e` |
| Run Playwright API tests | `yarn test:e2e:api` |
| Run Playwright utils tests | `yarn test:e2e:utils` |
| Run Cucumber BDD tests | `yarn test:bdd` |
| Run backend lint | `yarn lint` |
| Run backend lint (CI formatter) | `yarn lint:ci` |
| Run backend + frontend lint | `yarn lint:all` |
| Auto-fix backend lint issues | `yarn lint:fix` |
| Auto-fix backend + frontend lint issues  | `yarn lint:fix:all` |
| Build backend TypeScript | `yarn build` |
| Build frontend production bundle | `yarn --cwd frontend build` |

## Docker Workflows via Yarn (Recommended)

| Description | Command |
| --- | --- |
| Start core Docker stack | `yarn docker:start` |
| Start full Docker stack | `yarn docker:start:full` |
| Stop Docker stack | `yarn docker:stop` |
| Tail Docker logs | `yarn docker:logs` |
| Rebuild/restart Docker stack | `yarn docker:refresh` |
| Reset Docker resources | `yarn docker:reset` |
| Open backend shell in Docker | `yarn docker:shell:backend` |
| Open frontend shell in Docker | `yarn docker:shell:frontend` |
| Run DB migrate in Docker | `yarn docker:db:migrate` |
| Undo DB migrate in Docker | `yarn docker:db:migrate:undo` |
| Seed DB in Docker | `yarn docker:db:seed` |
| Undo seed in Docker | `yarn docker:db:seed:undo` |
| Run logical data model in Docker | `yarn docker:ldm` |
| Run lint in Docker | `yarn docker:lint` |
| Auto-fix lint in Docker | `yarn docker:lint:fix` |
| Import system data in Docker | `yarn docker:import:system` |
| Run makecolors in Docker | `yarn docker:makecolors` |
| Run dynamic security scan (DSS) | `yarn docker:dss` |

## Database and CLI Commands

| Description | Command |
| --- | --- |
| Run migrations | `yarn db:migrate` |
| Undo latest migration | `yarn db:migrate:undo` |
| Generate migration | `yarn db:migrate:create -- --name <name>` |
| Run seeders | `yarn db:seed` |
| Undo seeders | `yarn db:seed:undo` |
| Run logical data model | `yarn db:ldm` |
| Validate DB filenames | `yarn db:validate:filenames` |
| Bootstrap admin user | `yarn cli:db-bootstrap-admin` |
| Import HSES data | `yarn cli:import-hses` |
| Import reports | `yarn cli:import-reports` |
| Import system data | `yarn cli:import-system` |
| Create monitoring goals | `yarn cli:create-monitoring-goals` |

## Compose Context (Current)

| Context | Compose file(s) | Primary entry command |
| --- | --- | --- |
| Local dev core/full | `docker/compose/docker-compose.yml` | `yarn docker:start` / `yarn docker:start:full` |
| Local debug overlay | `docker/compose/docker-compose.yml` + `docker/compose/dev.debug.yml` | `DEV_DEBUG=true task stack-up` |
| Dynamic security scan | `docker/compose/dss.yml` | `yarn docker:dss` |

## Advanced Task Commands (Internal Equivalents)

These are useful for debugging or one-off orchestration. For normal use, prefer Yarn `docker:*` helpers.

- `task stack-up`
- `task stack-up-full`
- `task stack-down`
- `task stack-logs`
- `task stack-shell TARGET=backend`
- `task stack-shell TARGET=frontend`
- `task stack-run TARGET=backend -- <cmd>`
- `task stack-exec TARGET=backend -- <cmd>`
- `task refresh`
- `task reset`

## Supporting Bash Helpers

- `bin/run-tool [--local|--build|--auto] <src-path> [args...]`
  - `--auto` (default): uses `tsx <src-path>` locally and `node ./build/server/<src-path>` when `VCAP_APPLICATION` is set.
  - `--local`: forces `tsx <src-path>`.
  - `--build`: forces `node ./build/server/<src-path>`; if `<src-path>` ends in `.ts`, it is mapped to `.js` in build output.
- `bin/ci-env <command...>`
- `bin/test-backend-ci`
- `bin/build-coverage-report`
