# Office of Head Start Training & Technical Assistance Smart Hub

Welcome to the home of the OHS TTAHUB.

<table>
<tr>
<th scope="col">HHS</th>
<th scope="col">Ad Hoc</th>
</tr>
<tr>
<td>

[![HHS](https://circleci.com/gh/HHS/Head-Start-TTADP.svg?style=shield)](https://app.circleci.com/pipelines/github/HHS/Head-Start-TTADP)

</td>
<td>

[![adhocteam](https://circleci.com/gh/adhocteam/Head-Start-TTADP.svg?style=shield)](https://app.circleci.com/pipelines/github/adhocteam/Head-Start-TTADP)

</td>
</tr>
</table>

## What We're Building and Why

For the latest on our product mission, goals, initiatives, and KPIs, see the [Product Planning page](https://github.com/HHS/Head-Start-TTADP/wiki/Product-Planning).

## Getting Started

### Set up

*Warning* when using Docker to run either the full app or the backend services, PostgreSQL (5432) and Redis (6379) are both configured to bind to their well-known ports. This will fail if any other instances of
those services are already running on your machine.

#### Docker

1. Make sure Docker is installed. To check run `docker ps`.
2. Make sure you have Node 14.17.6 installed.
4. Copy `.env.example` to `.env`.
6. Change the `AUTH_CLIENT_ID` and `AUTH_CLIENT_SECRET` variables to to values found in the "Values for local development" section of the "Development Credentials" document. If you don't have access to this document, please ask in the hs-vendors-ohs-tta channel of the gsa-tts slack channel.
7. Optionally, set `CURRENT_USER` to your current user's uid:gid. This will cause files created by docker compose to be owned by your user instead of root.
3. Run `yarn docker:reset`. This builds the frontend and backend, installs dependencies, then runs database migrations and seeders. If this returns errors that the version of nodejs is incorrect, you may have older versions of the containers built. Delete those images and it should rebuild them.
10. Run `yarn docker:start` to start the application. The frontend will be available on `localhost:3000` and the backend will run on `localhost:8080`, API documentation will run on `localhost:5000`, and minio will run on `localhost:9000`.
11. Run `yarn docker:stop` to stop the servers and remove the docker containers.

The frontend [proxies requests](https://create-react-app.dev/docs/proxying-api-requests-in-development/) to paths it doesn't recognize to the backend.

Api documentation uses [Redoc](https://github.com/Redocly/redoc) to serve documentation files. These files can be found in the `docs/openapi` folder. Api documentation should be split into separate files when appropriate to prevent huge hard to grasp yaml files.

#### Local build

You can also run build commands directly on your host (without docker). Make sure you install dependencies when changing execution method. You could see some odd errors if you install dependencies for docker and then run yarn commands directly on the host, especially if you are developing on windows. If you want to use the host yarn commands be sure to run `yarn deps:local` before any other yarn commands. Likewise if you want to use docker make sure you run `yarn docker:deps`.

You must also install and run minio locally to use the file upload functionality. Please comment out `S3_ENDPOINT=http://minio:9000` and uncomment `S3_ENDPOINT=http://localhost:9000` in your .env file.

#### Precommit hooks

Our CI will fail if code is committed that doesn't pass our linter (eslint). This repository contains a pre-commit hook that runs eslint's built in "fix" command  on all staged javascript files so that any autofixable errors will be fixed. The precommit hook, in .gihooks/pre-commit, also contains code to auto-format our terraform files, which you can read more about [here](https://github.com/adhocteam/Head-Start-TTADP/tree/main/terraform#set-up).

If you are not using your own custom pre-commit hooks:

- **start from repo root directory**

- **make the pre-commit file executable**
chmod 755 .githooks/pre-commit

- **change your default hooks directory to `.githooks`.**
git config core.hooksPath .githooks

If you are already using git hooks, add the .githooks/pre-commit contents to your hooks directory or current pre-commit hook. Remember to make the file executable.

### Running Tests

#### Docker

If switching branches for code review, run `yarn docker:reset` before running your tests.

Run `yarn docker:test` to run all tests for the frontend and backend.

To only run the frontend tests run `yarn docker:test frontend`.

To only run the backend tests run `yarn docker:test backend`.

Migrations and seeding of the test db occurs within the script run by the `docker:test` command.

To run eslint run `yarn lint:all` or `yarn lint:fix:all` to have eslint attempt to fix linting problems.

### Docker on Windows

You may run into some issues running the docker commands on Windows:

 * If you run into `Permission Denied` errors see [this issue](https://github.com/docker/for-win/issues/3385#issuecomment-501931980)
 * You can try to speed up execution time on windows with solutions posted to [this issue](https://github.com/docker/for-win/issues/1936)

## Yarn Commands

| Docker Command | Description| Host Command | Local only Command |
|-|-|-|-|
| `yarn docker:deps` | Install dependencies for the frontend and backend | `yarn deps` | `yarn deps:local` |
| `yarn docker:start` | Starts the backend and frontend | | `yarn start:local` |
| `yarn docker:stop` | Stops the backend and frontend | | |
| `yarn docker:dbs:start` | Start only the supporting services | | |
| `yarn docker:dbs:stop` | Stop only the supporting services | | |
| `yarn docker:test` | Runs tests for the frontend and backend | | |
| `yarn docker:lint` | Runs the linter for the frontend and backend | | |
| `yarn docker:db:migrate` | Run migrations in docker containers | `yarn db:migrate` | |
| `yarn docker:db:migrate:undo` | Undo migrations in docker containers | `yarn db:migrate:undo` | |
| `yarn docker:db:seed` | Run all seeders located in `src/seeders` | `yarn db:seed` | |
| `yarn docker:db:seed:undo` | Undo all seeders located in `src/seeders` | `yarn db:seed:undo` | |
| | Starts the backend web process | `yarn start:web` | `yarn server` | |
| | Starts the worker process | `yarn start:worker` | `yarn worker` | |
| | Start the frontend | | `yarn client` |
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
| prod    | https://ttahub.ohs.acf.hhs.gov |

**Sandbox Environment**

An additional deployment environment called "sandbox" is available to developers for testing and
development on feature branches prior to making a commit to Ad Hoc's main branch and deploying to "dev".
The current [.circleci/config.yml](.circleci/config.yml) assumes deployments to this space are being made from
the Ad Hoc repository. Deployments are pushed to the ohstta-sandbox cloud.gov space. To conserve
resources, running application instances pushed to this space should be deleted as soon as they are no longer needed.
Running application instances can be deleted by logging into [cloud.gov][cloudgov], and then selecting and
deleting the application.

**Secret Management**

CircleCI's project-based "environment variables" are used for secret management. These secrets include:
- Cloud.gov deployer account username and password. These keys are specific to each cloud.gov
organization/space, i.e. each deployment environment, and can be [regenerated by developers][cloudgov-deployer]
who have proper cloud.gov permissions at any time.
- HSES authentication middleware secrets passed to the application as `AUTH_CLIENT_ID` and `AUTH_CLIENT_SECRET`.
- The application `SESSION_SECRET`.
- NewRelic license key, passed to the application as `NEW_RELIC_LICENSE_KEY`

Exception:
- The environment specific postgres database URI is automatically available in the relevant cloud.gov application environment (because they share a cloud.gov "space"). The URI is accessible to the application as POSTGRES_URL. Consequently, this secret does not need to be managed by developers.

**Adding environment variables to an application**

If you need to add a variable that is both public and _does not change_ between environments, simply add it under `env:` in **manifest.yml**. See `NODE_ENV` as an example.

If your env variable is secret or the value is dependent on the deployment environment follow these directions.

1. If secret, add your variable to CircleCI

	If the variable value you want to add needs to remain secret, you will need to add it as a project-based "environment variable" in CircleCI. Ad Hoc engineers can use [this link][circleci-envvar] to navigate to the Environment Variables page for our forked repository. Add your environment variables here. If you need different values for sandbox and dev make sure to make two variables, one for each environment.

	For example, if you needed to add an environment specific secret `SECRET_FRUIT` variable to your application, you could add `SANDBOX_SECRET_FRUIT` with value `strawberry` and `DEV_SECRET_FRUIT` with value `dewberry`.

1. Add both secret and public variables to manifest.yml

	In the application manifest, add your `SECRET_FRUIT` variable to the `env:` object. If you need another non-secret but environment specific variable, like `PUBLIC_VEGGIE`, in your application, add that here.

	**manifest.yml**

	```
	---
	applications:
	  - name: tta-smarthub-((env))
	    env:
	      SECRET_FRUIT: ((SECRET_FRUIT))
	      PUBLIC_VEGGIE: ((public_veggie))
	```

1. If public, add the variable values to your deployment_config files

	**deployment_config/sandbox_vars.yml**

	```
	public_veggie: spinach
	```

	**deployment_config/dev_vars.yml**

	```
	public_veggie: dill
	```

	You're all done with public env variables! In sandbox, `process.env.PUBLIC_VEGGIE` will be `"spinach"`. In dev, `process.env.PUBLIC_VEGGIE` will be `"dill"`.  🎉

1. If secret, pass your variables to the `cf_deploy` command in the circleci config.

	Make two additions here:
	- Add the variable under `parameters`. Give your variable a description and a type of `env_var_name`.
	- Under `steps:`, pass your new parameter to `cf push` with the `--var` flag. You can think of `cf_push` as a function, which uses the `parameters` as inputs. Make sure to retain the `${}` syntax. This forces CircleCI to interpret your `secret_fruit` parameter as a project-based environment variable, and make the correct substitution. This will become clearer in the next step.

	**config/config.yml**
	```
	commands:
	  ...
	  cf_deploy:
	    ...
	    parameters:
	      ...
	      secret_fruit:
	        description: "Name of CircleCI project environment variable that
	          holds the secret fruit"
	        type: env_var_name
	    steps:
	      ...
	      - run:
	          name: Push application with deployment vars
	          command: |
	            cf push --vars-file << parameters.deploy_config_file >> \
	              --var SECRET_FRUIT=${<< parameters.secret_fruit >>}
	```

1. If secret, in the `deploy` job, add the circle ci project environment variable name that you created in step 1 to the `cf_deploy` command as a parameter.

	**config/config.yml**
	```
	jobs:
	  ...
	  deploy:
	    ...
	    when: # sandbox
	      ...
	      steps:
	        - cf_deploy:
                secret_fruit: SANDBOX_SECRET_FRUIT
        when: # dev
	      ...
	      steps:
	        - cf_deploy:
                secret_fruit: DEV_SECRET_FRUIT
	```

	You're all done! In sandbox, `process.env.SECRET_FRUIT` will be `"strawberry"`. In dev, `process.env.SECRET_FRUIT` will be `"dewberry"`.  🎉


**Interacting with a deployed database**

Read [TTAHUB-System-Operations](https://github.com/HHS/Head-Start-TTADP/wiki/TTAHUB-System-Operations) for information on how production may be accessed.

Our project includes four deployed Postgres databases, one to interact with each application environment (sandbox, dev, staging, prod). For instructions on how to create and modify databases instances within the cloud.gov ecosystem see the [terraform/README.md](terraform/README.md).

You can run psql commands directly against a deployed database by following these directions.

1. Install Version 7 of the Cloud Foundry CLI tool

    - On MacOS: `brew install cloudfoundry/tap/cf-cli@7`
    - On other platforms: [Download and install cf][cf-install]. Be sure to get version 7.x

1. Login to cloud.gov account

    ```bash
    cf login -a api.fr.cloud.gov --sso
    # follow temporary authorization code prompts
    ```

1. Install the cloud foundry plugin [cf-service-connect][cf-service-connect]

	```bash
	# Example install for macOS
	cf install-plugin https://github.com/cloud-gov/cf-service-connect/releases/download/1.1.0/cf-service-connect-darwin-386
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

**Refreshing data in non-production environments**

In order to keep the non-production environments as close to production as possible we developed a way to transform a restored
version of the production database locally if using local database. The script can be run using the following:

```
	yarn processData:local

```
The transformed database can then be restored in the non-production environments.
For details on how to perform a backup and restore, there is information on the cloud.gov site:

<https://cloud.gov/docs/management/database-backup-restore/>

**Using Maintenance Mode**

if you need to put the application into maintenance mode, you can run the maintenance script located at `bin/maintenance`.

This script require that you have [Cloud Foundry's CLI v7](https://github.com/cloudfoundry/cli/wiki/V7-CLI-Installation-Guide) installed to run.

The script takes two flags
- \-m | \-\-maintenance\-mode controls whether the script takes the app into maintenance mode or out of it.
  - Options are "on" or "off
- \-e | \-\-environment controls which environment you are targeting.
  - Options are "sandbox", "dev", "staging", and "prod"

Ex.
```
# Puts the dev environment into maintenance mode
./bin/maintenance -e dev -m on
```

If you are not logged into the cf cli, it will ask you for an sso temporary password. You can get a temporary password at https://login.fr.cloud.gov/passcode.


<!-- Links -->

[adhoc-main]: https://github.com/adhocteam/Head-Start-TTADP/tree/main
[TTAHUB-System-Operations]: https://github.com/HHS/Head-Start-TTADP/wiki/TTAHUB-System-Operations
[circleci-envvar]: https://app.circleci.com/settings/project/github/adhocteam/Head-Start-TTADP/environment-variables?return-to=https%3A%2F%2Fcircleci.com%2Fdashboard
[cloudgov]: https://dashboard.fr.cloud.gov/home
[cloudgov-deployer]: https://cloud.gov/docs/services/cloud-gov-service-account/
[cf-install]: https://docs.cloudfoundry.org/cf-cli/install-go-cli.html
[cf-service-connect]: https://github.com/cloud-gov/cf-service-connect
[hhs-main]: https://github.com/HHS/Head-Start-TTADP/tree/main
[hhs-prod]: https://github.com/HHS/Head-Start-TTADP/tree/production
