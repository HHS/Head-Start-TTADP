# Yarn Commands

<!-- prettier-ignore-start -->
| Description | Docker Command | Host Command | Local only Command |
|-|-|-|-|
| Install dependencies for the frontend and backend | `yarn docker:deps` |`yarn deps` | `yarn deps:local` |
| Starts the backend and frontend | `yarn docker:start` | | `yarn start:local` |
| Stops the backend and frontend | `yarn docker:stop` | | |
| Start only the supporting services | | `yarn docker:dbs:start` | |
| Stop only the supporting services | `yarn docker:dbs:stop` || |
| Runs tests for the frontend and backend | `yarn docker:test` | | |
| Runs the linter for the frontend and backend | `yarn docker:lint` | | |
| Run migrations in docker containers | `yarn docker:db:migrate` | `yarn db:migrate` | |
| Undo migrations in docker containers | `yarn docker:db:migrate:undo` | `yarn db:migrate:undo` | |
| Run all seeders located in `src/seeders` | `yarn docker:db:seed` | `yarn db:seed` | |
| Undo all seeders located in `src/seeders` | `yarn docker:db:seed:undo` | `yarn db:seed:undo` | |
| Starts the backend web process | | `yarn start:web` | `yarn server` | |
| Starts the worker process | | `yarn start:worker` | `yarn worker` | |
| Start the frontend | | | `yarn client` |
| Run tests for only the backend | | `yarn test`| |
| Run tests for the backend with coverage and output results to xml files| | `yarn test:ci`| |
| Run `yarn test:ci` for both the frontend and backend | | `yarn test:all`| |
| Run the linter only for the backend | | `yarn lint` | |
| Run the linter for the the backend with results output to xml files | | `yarn lint:ci`| |
| Run `yarn lint:ci` for both the frontend and backend | | `yarn lint:all`| |
| Host the open api 3 spec using [redoc](https://github.com/Redocly/redoc) at `localhost:5003` | | `yarn docs:serve` | |
| Run cucumber tests | | `yarn cucumber` | |
| Collect backend coverage report | | `yarn coverage:backend` ||
<!-- prettier-ignore-end -->