# Command Reference

## Preferred Docker commands (Make)

| Description | Command |
| --- | --- |
| Start core local stack (`db`, `redis`, `backend`, `frontend`) | `make docker-start` |
| Start core stack + optional local services (`api-docs`, `minio`, `mailcatcher`, `redis-commander`) and the worker | `make docker-start-full` |
| Stop any running repo Docker resources | `make docker-stop` |
| Reset Docker state (remove volumes, rebuild, migrate, seed) | `make docker-reset` |
| Run backend + frontend Jest in isolated Docker test stack | `make docker-test` |
| Follow logs for the dev stack | `make docker-logs` |
| Open shell in backend container | `make docker-shell-backend` |
| Open shell in frontend container | `make docker-shell-frontend` |

## Yarn compatibility aliases

These Yarn scripts remain available for the core Docker workflow:

- `yarn docker:start` -> `make docker-start`
- `yarn docker:start:full` -> `make docker-start-full`
- `yarn docker:stop` -> `make docker-stop`
- `yarn docker:reset` -> `make docker-reset`
- `yarn docker:test` -> `make docker-test`

## Native host commands

| Description | Command |
| --- | --- |
| Install dependencies (CI-style lockfile install) | `yarn deps` |
| Install dependencies for host-only local development | `yarn deps:local` |
| Start backend + frontend + worker locally | `yarn start:local` |
| Start backend only (built output) | `yarn start:web` |
| Start backend dev watcher | `yarn server` |
| Start worker dev watcher | `yarn worker` |
| Start frontend dev server | `yarn client` |
| Run backend tests | `yarn test` |
| Run backend CI test command | `yarn test:ci` |
| Run backend + frontend CI tests | `yarn test:all` |
| Run backend lint | `yarn lint` |
| Run backend + frontend lint | `yarn lint:all` |
| Auto-fix backend + frontend lint issues | `yarn lint:fix:all` |
| Run backend migrations | `yarn db:migrate` |
| Run backend seeders | `yarn db:seed` |
| Build backend TypeScript | `yarn build` |
| Build frontend production bundle | `yarn --cwd frontend build` |
