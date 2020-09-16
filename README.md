Office of Head Start Training & Technical Assistance Data Platform
=============================================

Welcome to the home of the OHS TTADP.

What We're Building and Why
---------------

For the latest on our product mission, goals, initiatives, and KPIs, see the [Product Planning page](https://github.com/HHS/Head-Start-TTADP/wiki/Product-Planning).  


Getting Started
---------------

Make sure Docker is installed. To check run `docker ps`

Run `yarn docker:deps`. This builds the frontend and backend docker containers and install dependencies. You only need to run this step the first time you fire up the app and when dependencies are added/updated/removed. Running `yarn docker:start` starts the backend and frontend, browse to `http://localhost:3000` to hit the frontend and `http://localhost:3000/api` to hit the backend. Copying `.env.example` to `.env`, substituting in your user id and group id will cause any files created in docker containers to be owned by your user on your host.

You can also run build commands directly on your host (without docker). Make sure you install dependencies when changing execution method. You could see some odd errors if you install dependencies for docker and then run yarn commands directly on the host, especially if you are developing on windows. If you want to use the host yarn commands be sure to run `yarn deps` before any other yarn commands. Likewise if you want to use docker make sure you run `yarn docker:deps`.

The frontend [proxies requests](https://create-react-app.dev/docs/proxying-api-requests-in-development/) to paths it doesn't recognize to the backend.

Running Tests
-------------

Run `yarn docker:deps` to install dependencies. Run `yarn docker:db:migrate` and `yarn docker:test` to run all tests for the frontend and backend.

Docker on Windows
-----------------

You may run into some issues running the docker commands on Windows:

 * If you run into `Permission Denied` errors see [this issue](https://github.com/docker/for-win/issues/3385#issuecomment-501931980)
 * You can try to speed up execution time on windows with solutions posted to [this issue](https://github.com/docker/for-win/issues/1936)

Other Commands
--------------

| Docker Command | Description| Host Command |
|-|-|-|
| `yarn docker:deps` | Install dependencies for the frontend and backend | `yarn deps` |
| `yarn docker:start` | Starts the backend and frontend | `yarn start` |
| `yarn docker:stop` | Stops the backend and frontend |
| `yarn docker:test` | Runs tests for the frontend and backend |
| `yarn docker:lint` | Runs the linter for the frontend and backend |
| `yarn docker:db:migrate` | Run migrations in docker containers | `yarn db:migrate` |
| `yarn docker:db:migrate:undo` | Undo migrations in docker containers | `yarn db:migrate:undo` |
| | Install dependencies for the frontend and backend (for local development)  | `yarn deps:local` |
| | Starts the backend | `yarn server` |
| | Start the frontend | `yarn client`
| | Run tests for only the backend | `yarn test`|
| | Run tests for the backend with coverage and output results to xml files|  `yarn test:ci`|
| | Run `yarn test:ci` for both the frontend and backend | `yarn test:all`|
| | Run the linter only for the backend | `yarn lint` |
| | Run the linter for the the backend with results output to xml files | `yarn lint:ci`|
| | Run `yarn lint:ci` for both the frontend and backend | `yarn lint:all`|

Deployment
----------

Deployment to `Staging` and `Production` environments is automated through the CI/CD pipeline.

* The `main` branch deploys to `Staging`.
* The `production` branch deploys to `Production`
