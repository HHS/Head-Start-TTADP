# Office of Head Start Training & Technical Assistance Data Platform

Welcome to the home of the OHS TTADP.

## What We're Building and Why

For the latest on our product mission, goals, initiatives, and KPIs, see the [Product Planning page](https://github.com/HHS/Head-Start-TTADP/wiki/Product-Planning).

## Getting Started

### Set up

Make sure Docker is installed. To check run `docker ps`

Run `yarn docker:deps`. This builds the frontend and backend docker containers and install dependencies. You only need to run this step the first time you fire up the app and when dependencies are added/updated/removed. Running `yarn docker:start` starts the backend and frontend, browse to `http://localhost:3000` to hit the frontend and `http://localhost:3000/api` to hit the backend. Copying `.env.example` to `.env`, substituting in your user id and group id will cause any files created in docker containers to be owned by your user on your host.

You can also run build commands directly on your host (without docker). Make sure you install dependencies when changing execution method. You could see some odd errors if you install dependencies for docker and then run yarn commands directly on the host, especially if you are developing on windows. If you want to use the host yarn commands be sure to run `yarn deps:local` before any other yarn commands. Likewise if you want to use docker make sure you run `yarn docker:deps`.

The frontend [proxies requests](https://create-react-app.dev/docs/proxying-api-requests-in-development/) to paths it doesn't recognize to the backend.

Api documentation uses [Redoc](https://github.com/Redocly/redoc) to serve documentation files. These files can be found in the `docs/openapi` folder. Api documentation should be split into separate files when appropriate to prevent huge hard to grasp yaml files.

### Running Tests

Run `yarn docker:deps` to install dependencies. Run `yarn docker:db:migrate` and `yarn docker:test` to run all tests for the frontend and backend.

### Docker on Windows

You may run into some issues running the docker commands on Windows:

 * If you run into `Permission Denied` errors see [this issue](https://github.com/docker/for-win/issues/3385#issuecomment-501931980)
 * You can try to speed up execution time on windows with solutions posted to [this issue](https://github.com/docker/for-win/issues/1936)

## Yarn Commands

| Docker Command | Description| Host Command | Local only Command |
|-|-|-|-|
| `yarn docker:deps` | Install dependencies for the frontend and backend | `yarn deps` | `yarn deps:local` |
| `yarn docker:start` | Starts the backend and frontend | | `yarn start:local` |
| `yarn docker:stop` | Stops the backend and frontend | |
| `yarn docker:test` | Runs tests for the frontend and backend | |
| `yarn docker:lint` | Runs the linter for the frontend and backend | |
| `yarn docker:db:migrate` | Run migrations in docker containers | `yarn db:migrate` | |
| `yarn docker:db:migrate:undo` | Undo migrations in docker containers | `yarn db:migrate:undo` | |
| `yarn docker:db:seed` | Run all seeders located in `src/seeders` | `yarn db:seed` | |
| `yarn docker:db:seed:undo` | Undo all seeders located in `src/seeders` | `yarn db:seed:undo` | |
| | Install dependencies for the frontend and backend (for local development)  | `yarn deps:local` | |
| | Starts the backend | `yarn start` |`yarn server` | |
| | Start the frontend | `yarn client` | |
| | Run tests for only the backend | `yarn test`| |
| | Run tests for the backend with coverage and output results to xml files|  `yarn test:ci`| |
| | Run `yarn test:ci` for both the frontend and backend | `yarn test:all`| |
| | Run the linter only for the backend | `yarn lint` | |
| | Run the linter for the the backend with results output to xml files | `yarn lint:ci`| |
| | Run `yarn lint:ci` for both the frontend and backend | `yarn lint:all`| |
| | Host the open api 3 spec using [redoc](https://github.com/Redocly/redoc) at `localhost:5000` | `yarn docs:serve` | |
| | Run cucumber tests | `yarn cucumber` | |

## Infrastructure

### Persistent vs Ephemeral Infrastructure

The infrastructure used to run this application can be categorized into two distinct types: ephemeral and persistent.
- **Ephemeral infrastructure** is all the infrastructure that is recreated each time the application is deployed. Ephemeral infrastructure includes the "application" (as defined in Cloud.gov), the EC2 instances that application runs on, and the routes that application utilizes. This infrastructure is defined and deployed to Cloud.gov by the CircleCI configuration.
- **Persistent infrastructure** is all the infrastructure that remains constant and unchanged despite application deployments. Persistent infrastructure includes the database used in each development environment. This infrastructure is defined and instantiated on Cloud.gov by the Terraform configuration files. For more about Terraform see [terraform/README.md](terraform/README.md).

### CI/CD with CircleCI

#### Continuous Integration (CI)

Linting, unit tests, test coverage analysis, and an accessibility scan are all run automatically on each push to the Ad Hoc fork of HHS/Head-Start-TTADP repo and the HHS/Head-Start-TTADP repo. In the Ad Hoc repository, merges to the main branch are blocked if the CI tests do not pass. The continuous integration pipeline is configured via CircleCi. The bulk of CI configurations can be found in this repo's [.circleci/config.yml](.circleci/config.yml) file. For more information on the security audit and scan tools used in the continuous integration pipeline see [ADR 0009](docs/adr/0009-security-scans.md).

#### Continuous Deployment (CD)

This application consists of three deployment environments: development/dev, staging, and
production/prod. The CD pipeline is configured via CircleCi.
The bulk of CD configurations can be found in this repo's [.circleci/config.yml](.circleci/config.yml) file,
the [application manifest](manifest.yml) and the environment specific [deployment_config](deployment_config/)
variable files.

Commits to specific branches in github repositories start automatic deployments as follows:

* **Dev** deployed by commit to [main branch][adhoc-main] of Ad Hoc fork of HHS/Head-Start-TTADP repo
* **Staging** deployed by commit to [main branch][hhs-main] of HHS/Head-Start-TTADP repo
* **Prod** deployed by commit to [production branch][hhs-prod] of HHS/Head-Start-TTADP repo

The application is deployed to the following URLs:

| Environment | URL |
|:------------|:----|
| sandbox | https://tta-smarthub-sandbox.app.cloud.gov/ |
| dev     | https://tta-smarthub-dev.app.cloud.gov/ |
| staging | https://tta-smarthub-staging.app.cloud.gov/ |
| prod    | |

**Sandbox Environment**

An additional deployment environment called "sandbox" is available to developers for testing and
development on feature branches prior to making a commit to Ad Hoc's main branch and deploying to "dev".
The current [.circleci/config.yml](.circleci/config.yml) assumes deployments to this space are being made from
the Ad Hoc repository. Deployments are pushed to the ohstta-sandbox cloud.gov space. To conserve
resources, running application instances pushed to this space should be deleted as soon as they are no longer needed.
Running application instances can be deleted by logging into [cloud.gov][cloudgov], and then selecting and
deleting the application.

**Secret Management**

CircleCI's [project-based environment variables][env-vars] are used for secret management. These secrets include:
- Cloud.gov deployer account username and password. These keys are specific to each cloud.gov
organization/space, i.e. each deployment environment, and can be [regenerated by developers][cloudgov-deployer]
who have proper cloud.gov permissions at any time.
- HSES authentication middleware secrets passed to the application as `AUTH_CLIENT_ID` and `AUTH_CLIENT_SECRET`.
- The application `SESSION_SECRET`.
- NewRelic license key, passed to the application as `NEW_RELIC_LICENSE_KEY`

**Interacting with a deployed database**

Our project includes four deployed Postgres databases, one to interact with each application environment (sandbox, dev, staging, prod). For instructions on how to create and modify databases instances within the cloud.gov ecosystem see the [terraform/README.md](terraform/README.md).

You can run psql commands directly against a deployed database by following these directions.

1. Install the cloud foundry plugin [cf-service-connect][cf-service-connect]
	
	```bash
	# Example install for macOS
	cf install-plugin https://github.com/18F/cf-service-connect/releases/download/1.1.0/cf-service-connect-darwin-386
	```

1. Target the desired organization and space
	
	```bash
	cf target -o <org> -s <space>
	# Example for sandbox
	cf target -o hhs-acf-ohs-tta -s ttahub-sandbox
	```

1. Connect to the desired database

	```bash
	cf connect-to-service <app_name> <service_instance_name>
	# Example for sandbox
	cf connect-to-service tta-smarthub-sandbox ttahub-sandbox
	```

	On success, your terminal prompt will change to match the `db_name` from the database instance credentials.
	This indicates you are in an open psql session, the command-line interface to PostgreSQL.

<!-- Links -->

[adhoc-main]: https://github.com/adhocteam/Head-Start-TTADP/tree/main
[cloudgov]: https://dashboard.fr.cloud.gov/home
[cloudgov-deployer]: https://cloud.gov/docs/services/cloud-gov-service-account/
[cf-service-connect]: https://github.com/cloud-gov/cf-service-connect
[hhs-main]: https://github.com/HHS/Head-Start-TTADP/tree/main
[hhs-prod]: https://github.com/HHS/Head-Start-TTADP/tree/production
