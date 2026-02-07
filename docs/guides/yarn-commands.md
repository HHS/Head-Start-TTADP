# Yarn Commands

## Setup

<!-- prettier-ignore-start -->
| Description | Docker Command | Host Command | Local only Command |
| --- | --- | --- | --- |
| Install dependencies for the frontend and backend | `yarn docker:deps` | `yarn deps` | `yarn deps:local` |
<!-- prettier-ignore-end -->

## Services

<!-- prettier-ignore-start -->
| Description | Docker Command | Host Command | Local only Command |
| --- | --- | --- | --- |
| Starts the backend and frontend | `yarn docker:start` | | `yarn start:local` |
| Stops the backend and frontend | `yarn docker:stop` | | |
| Start only the supporting services | | `yarn docker:dbs:start` | |
| Stops the backend and frontend (alias) | | `yarn docker:dbs:stop` | |
| Starts the backend web process | | `yarn start:web` | `yarn server` |
| Starts the worker process | | `yarn start:worker` | `yarn worker` |
| Start the frontend | | | `yarn client` |
<!-- prettier-ignore-end -->

## Testing

<!-- prettier-ignore-start -->
| Description | Docker Command | Host Command | Local only Command |
| --- | --- | --- | --- |
| Runs tests for the frontend and backend | `yarn docker:test` | | |
| Run tests for only the backend | | `yarn test` | |
| Run tests for the backend with coverage and output results to xml files | | `yarn test:ci` | |
| Run `yarn test:ci` for both the frontend and backend | | `yarn test:all` | |
| Run Playwright E2E tests | | `yarn e2e` | |
| Run Playwright API tests | | `yarn e2e:api` | |
| Run cucumber tests | | `yarn cucumber` | |
| Collect backend coverage report | | `yarn coverage:backend` | |
<!-- prettier-ignore-end -->

## Linting

<!-- prettier-ignore-start -->
| Description | Docker Command | Host Command | Local only Command |
| --- | --- | --- | --- |
| Runs the linter for the frontend and backend | `yarn docker:lint` | | |
| Run the linter only for the backend | | `yarn lint` | |
| Run the linter for the backend with results output to xml files | | `yarn lint:ci` | |
| Run `yarn lint:ci` for both the frontend and backend | | `yarn lint:all` | |
| Auto-fix linting issues for backend and frontend | | `yarn lint:fix:all` | |
<!-- prettier-ignore-end -->

## Database

<!-- prettier-ignore-start -->
| Description | Docker Command | Host Command | Local only Command |
| --- | --- | --- | --- |
| Run migrations | `yarn docker:db:migrate` | `yarn db:migrate` | |
| Undo migrations | `yarn docker:db:migrate:undo` | `yarn db:migrate:undo` | |
| Run all seeders located in `src/seeders` | `yarn docker:db:seed` | `yarn db:seed` | |
| Undo all seeders located in `src/seeders` | `yarn docker:db:seed:undo` | `yarn db:seed:undo` | |
<!-- prettier-ignore-end -->

## Building

<!-- prettier-ignore-start -->
| Description | Docker Command | Host Command | Local only Command |
| --- | --- | --- | --- |
| Build backend TypeScript | | `yarn build` | |
| Build frontend for production | | `yarn --cwd frontend build` | |
<!-- prettier-ignore-end -->

## Other

<!-- prettier-ignore-start -->
| Description | Docker Command | Host Command | Local only Command |
| --- | --- | --- | --- |
| Host the OpenAPI 3 spec using [Redoc](https://github.com/Redocly/redoc) at `localhost:5003` | | `yarn docs:serve` | |
| Start backend with debugger on port 9229 | | `yarn server:debug` | |
<!-- prettier-ignore-end -->
