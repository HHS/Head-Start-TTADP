# Office of Head Start Training & Technical Assistance Smart Hub

Welcome to the home of the OHS TTAHUB.

<table>
<tr>
<th scope="col">HHS</th>
</tr>
<tr>
<td>

[![HHS](https://circleci.com/gh/HHS/Head-Start-TTADP.svg?style=shield)](https://app.circleci.com/pipelines/github/HHS/Head-Start-TTADP)

</td>
</tr>
</table>

## What We're Building and Why

For the latest on our product mission, goals, initiatives, and KPIs, see the [Product Planning page](https://github.com/HHS/Head-Start-TTADP/wiki/Product-Planning).

## Development Setup

### Run With Docker

1. Install Docker. To check run `docker ps`.
2. Install Node, matching the version in [.nvmrc](.nvmrc).
3. Copy `.env.example` to `.env`.
4. Change the `AUTH_CLIENT_ID` and `AUTH_CLIENT_SECRET` variables to to values found in the team Keybase account. If you don't have access to Keybase, please ask in the acf-head-start-eng slack channel for access.
5. Optionally, set `CURRENT_USER` to your current user's uid:gid. This will cause files created by docker compose to be owned by your user instead of root.
6. Run `yarn docker:reset`. This builds the frontend and backend, installs dependencies, then runs database migrations and seeders.
7. Run `yarn docker:start` to start the application.

   - The [frontend][frontend] will run on `localhost:3000`
   - The [backend][backend] will run on `localhost:8080`
   - [API documentation][API documentation] will run on `localhost:5003`
   - [minio][minio] (S3-compatible file storage) will run on `localhost:9000`

8. Run `yarn docker:stop` to stop the servers and remove the docker containers.

**Notes**

The frontend [proxies requests](https://create-react-app.dev/docs/proxying-api-requests-in-development/) to paths it doesn't recognize to the backend.

Api documentation uses [Redoc](https://github.com/Redocly/redoc) to serve documentation files. These files can be found in the `docs/openapi` folder. Api documentation should be split into separate files when appropriate to prevent huge hard to grasp yaml files.

**Troubleshooting**

If you see errors that the version of nodejs is incorrect, you may have older versions of the containers built.
Delete those images and rerun ``yarn docker:reset`.

When using Docker to run either the full app or the backend services, PostgreSQL (5432) and Redis (6379) are both configured to bind to their well-known ports. This will fail if any other instances of those services are already running on your machine.

On a Mac with Brew installed Docker, yarn commands may fail due to the absence of `docker-compose` (vs `docker compose`). To resolve:
`brew install docker-compose`

**Apple Silicon & Chromium**

If you are using a newer Mac with the Apple Silicon chipset, puppeteer install fails with the message: `"The chromium binary is not available for arm64"`, see the section immediately following this one, entitled "Apple Silicon & Chromium" for instructions on how to proceed.

On a Mac with Apple Silicon, puppeteer install fails with the message:
`"The chromium binary is not available for arm64"`

See [docker-compose.override.yml](docker-compose.override.yml) and uncomment the relevant lines to skip downloading chromium and use the host's binary instead.

You will need to have chromium installed (you probably do not). The recommended installation method is to use brew: `brew install chromium --no-quarantine`

To ~/.zshrc (or your particular shell config), you'll need to add:

```sh
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
export PUPPETEER_EXECUTABLE_PATH=`which chromium`
```

### Run Natively

You can also run build commands directly on your host (without docker). Make sure you install dependencies when changing execution method. You could see some odd errors if you install dependencies for docker and then run yarn commands directly on the host, especially if you are developing on windows. If you want to use the host yarn commands be sure to run `yarn deps:local` before any other yarn commands. Likewise if you want to use docker make sure you run `yarn docker:deps`.

You must also install and run minio locally to use the file upload functionality. Please comment out `S3_ENDPOINT=http://minio:9000` and uncomment `S3_ENDPOINT=http://localhost:9000` in your .env file.

### Import Current Production Data

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

bounce.sql

```sh
select pg_terminate_backend(pid) from pg_stat_activity where datname='ttasmarthub';
drop database ttasmarthub;
create database ttasmarthub;
```

On Windows
TBD

### Precommit hooks

Our CI will fail if code is committed that doesn't pass our linter (eslint). This repository contains a pre-commit hook that runs eslint's built in "fix" command on all staged javascript files so that any autofixable errors will be fixed. The precommit hook, in .gihooks/pre-commit, also contains code to auto-format our terraform files, which you can read more about [here](terraform/README.md).

If you are not using your own custom pre-commit hooks:

- start from repo root directory
- make the pre-commit file executable:
  `chmod 755 .githooks/pre-commit`
- change your default hooks directory to [.githooks](.githooks):
  `git config core.hooksPath .githooks`

If you are already using git hooks, add the [.githooks/pre-commit](.githooks/pre-commit) contents to your hooks directory or current pre-commit hook. Remember to make the file executable.

## Local Testing

### Running Tests With Docker

If switching branches for code review, run `yarn docker:reset` before running your tests.

Run `yarn docker:test` to run all tests for the frontend and backend.

To only run the frontend tests run `yarn docker:test frontend`.

To only run the backend tests run `yarn docker:test backend`.

Migrations and seeding of the test db occurs within the script run by the `docker:test` command.

To run eslint run `yarn lint:all` or `yarn lint:fix:all` to have eslint attempt to fix linting problems.

> [!NOTE]
> You may run into some issues running the docker commands on Windows:
>
> - If you run into `Permission Denied` errors see [this issue](https://github.com/docker/for-win/issues/3385#issuecomment-501931980)
> - You can try to speed up execution time on windows with solutions posted to [this issue](https://github.com/docker/for-win/issues/1936)

### Coverage reports

On the frontend, the lcov and HTML files are generated as normal, however on the backend, the folders are tested separately. The command `yarn coverage:backend` will concatenate the lcov files and also generate an HTML file. However, this provess requires `lcov` to be installed on a user's computer. On Apple, you can use Homebrew - `brew install lcov`. On a Windows machine, your path may vary, but two options include WSL and [this chocolatey package](https://community.chocolatey.org/packages/lcov).

Another important note for running tests on the backend - we specifically exclude files on the backend that follow the `*CLI.js` naming convention (for example, `adminToolsCLI.js`) from test coverage. This is meant to exclude files intended to be run in the shell. Any functionality in theses files should be imported from a file that is tested. The `src/tools folder` is where these files have usually lived and there are lots of great examples of the desired pattern in that folder.

#### Coverage reports: Uncovered lines on PR builds

The uncovered lines on PR is generated by finding the intersection between the jest generated coverage file with the git change list for the PR. The additional set of artifacts is generated to aid in providing test coverage for each PR.

- coverage/coverage-final.json - Only on test_backend, all the distinct jest run outputs are consolidated into a unified coverage-final.json file.
- uncovered-lines/uncovered-lines.html - A human readable structure identifing all the lines from this PR that are uncovered by jest tests.
- uncovered-lines/uncovered-lines.json - A json structure identifing all the lines from this PR that are uncovered by jest tests.

This Uncovered lines on PR builds can be configured to fail builds by either perminently changing or overiding the pipeline perameter `fail-on-modified-lines` to true, defaults to false.

### Building Tests

#### Helpful notes on writing (backend) tests

It's important that our tests fully clean up after themselves if they interact with the database. This way, tests do not conflict when run on the CI and remain as deterministic as possible.The best way to do this is to run them locally in an isolated environment and confirm that they are sanitary.

With that in mind, there a few "gotchas" to remember to help write sanitary tests.

- `Grant.destroy` needs to run with `individualHooks: true` or the related GrantNumberLink model prevents delete. Additionally, the hooks on destroy also update the materialized view (GrantRelationshipToActive).
- When you call `Model.destroy` you should be adding `individualHooks: true` to the Sequelize options. Often this is required for proper cleanup. There may be times when this is undesirable; this should be indicated with a comment.
- Be aware of paranoid models. For those models: force: true gets around the soft delete. If they are already soft-deleted though, you need to remove the default scopes paranoid: true does it, as well as Model.unscoped()
- There are excellent helpers for creating and destroying common Model mocks in `testUtils.js`. Be aware that they take a scorched earth approach to cleanup. For example, when debugging a flaky test, it was discovered that `destroyReport` was removing a commonly used region.
- The next section details additional tools, found in `src/lib/programmaticTransaction.ts`, which make maintaining a clean database state when writing tests a breeze.

#### Database State Management in Tests

The guidance is on using the `captureSnapshot` and `rollbackToSnapshot` functions from `src/lib/programmaticTransaction.ts` to manage database state during automated testing with Jest. These functions ensure that each test is executed in a clean state, preventing tests from affecting each other and improving test reliability.

##### Functions Overview

- **`captureSnapshot()`**: Captures the current state of the database, specifically the maximum IDs from specified tables, which is used to detect and revert changes.
- **`rollbackToSnapshot(snapshot: MaxIdRecord[])`**: Uses the snapshot taken by `captureSnapshot()` to revert the database to its state at the time of the snapshot. This is crucial for cleaning up after tests that alter the database.

##### Example Usage

###### Example 1: Using `beforeAll` and `afterAll`

In this example, `captureSnapshot` and `rollbackToSnapshot` are used at the Jest suite level to manage database states before and after all tests run. This is useful when tests are not independent or when setup/teardown for each test would be too costly.

```javascript
describe("Database State Management", () => {
  let snapshot;

  beforeAll(async () => {
    // Capture the initial database state before any tests run
    snapshot = await transactionModule.captureSnapshot();
  });

  afterAll(async () => {
    // Roll back to the initial state after all tests have completed
    await transactionModule.rollbackToSnapshot(snapshot);
  });

  it("Test Case 1", async () => {
    // Test actions that modify the database
  });

  it("Test Case 2", async () => {
    // Further test actions that modify the database
  });
});
```

###### Example 2: Using at the Beginning and End of Each Test Case

This approach uses `captureSnapshot` and `rollbackToSnapshot` at the start and end of each individual test. It is most effective when tests are meant to run independently, ensuring no residual data affects subsequent tests.

```javascript
describe("Individual Test Isolation", () => {
  it("Test Case 1", async () => {
    const snapshot = await transactionModule.captureSnapshot();
    // Actions modifying the database
    await transactionModule.rollbackToSnapshot(snapshot);
  });

  it("Test Case 2", async () => {
    const snapshot = await transactionModule.captureSnapshot();
    // More actions modifying the database
    await transactionModule.rollbackToSnapshot(snapshot);
  });
});
```

## Yarn Commands

| Docker Command                | Description                                                                                  | Host Command            | Local only Command |
| :---------------------------- | :------------------------------------------------------------------------------------------- | :---------------------- | :----------------- | --- |
| `yarn docker:deps`            | Install dependencies for the frontend and backend                                            | `yarn deps`             | `yarn deps:local`  |
| `yarn docker:start`           | Starts the backend and frontend                                                              |                         | `yarn start:local` |
| `yarn docker:stop`            | Stops the backend and frontend                                                               |                         |                    |
| `yarn docker:dbs:start`       | Start only the supporting services                                                           |                         |                    |
| `yarn docker:dbs:stop`        | Stop only the supporting services                                                            |                         |                    |
| `yarn docker:test`            | Runs tests for the frontend and backend                                                      |                         |                    |
| `yarn docker:lint`            | Runs the linter for the frontend and backend                                                 |                         |                    |
| `yarn docker:db:migrate`      | Run migrations in docker containers                                                          | `yarn db:migrate`       |                    |
| `yarn docker:db:migrate:undo` | Undo migrations in docker containers                                                         | `yarn db:migrate:undo`  |                    |
| `yarn docker:db:seed`         | Run all seeders located in `src/seeders`                                                     | `yarn db:seed`          |                    |
| `yarn docker:db:seed:undo`    | Undo all seeders located in `src/seeders`                                                    | `yarn db:seed:undo`     |                    |
|                               | Starts the backend web process                                                               | `yarn start:web`        | `yarn server`      |     |
|                               | Starts the worker process                                                                    | `yarn start:worker`     | `yarn worker`      |     |
|                               | Start the frontend                                                                           |                         | `yarn client`      |
|                               | Run tests for only the backend                                                               | `yarn test`             |                    |
|                               | Run tests for the backend with coverage and output results to xml files                      | `yarn test:ci`          |                    |
|                               | Run `yarn test:ci` for both the frontend and backend                                         | `yarn test:all`         |                    |
|                               | Run the linter only for the backend                                                          | `yarn lint`             |                    |
|                               | Run the linter for the the backend with results output to xml files                          | `yarn lint:ci`          |                    |
|                               | Run `yarn lint:ci` for both the frontend and backend                                         | `yarn lint:all`         |                    |
|                               | Host the open api 3 spec using [redoc](https://github.com/Redocly/redoc) at `localhost:5003` | `yarn docs:serve`       |                    |
|                               | Run cucumber tests                                                                           | `yarn cucumber`         |                    |
|                               | Collect backend coverage report                                                              | `yarn coverage:backend` |                    |

## Infrastructure

### Persistent vs Ephemeral Infrastructure

The infrastructure used to run this application can be categorized into two distinct types: ephemeral and persistent.

- **Ephemeral infrastructure** is all the infrastructure that is recreated each time the application is deployed. Ephemeral infrastructure includes the "application" (as defined in Cloud.gov), the EC2 instances that application runs on, and the routes that application utilizes. This infrastructure is defined and deployed to Cloud.gov by the CircleCI configuration.
- **Persistent infrastructure** is all the infrastructure that remains constant and unchanged despite application deployments. Persistent infrastructure includes the database used in each development environment. This infrastructure is defined and instantiated on Cloud.gov by the Terraform configuration files. For more about Terraform see [terraform/README.md](terraform/README.md).

### CI/CD with CircleCI

#### Continuous Integration (CI)

Linting, unit tests, test coverage analysis, and an accessibility scan are all run automatically on each push to the Ad Hoc fork of HHS/Head-Start-TTADP repo and the HHS/Head-Start-TTADP repo. In the Ad Hoc repository, merges to the main branch are blocked if the CI tests do not pass. The continuous integration pipeline is configured via CircleCi. The bulk of CI configurations can be found in this repo's [.circleci/config.yml](.circleci/config.yml) file. For more information on the security audit and scan tools used in the continuous integration pipeline see [ADR 0009](docs/adr/0009-security-scans.md).

#### Creating and Applying a Deploy Key

In order for CircleCi to correctly pull the latest code from Github, we need to create and apply a SSH token to both Github and CircleCi.

The following links outline the steps to take:
https://circleci.com/docs/github-integration/#create-a-github-deploy-key
https://docs.github.com/en/authentication/connecting-to-github-with-ssh/generating-a-new-ssh-key-and-adding-it-to-the-ssh-agent

Steps to create and apply deploy token:

1. Open the Git Bash CMD window
2. Enter the following command with your github (admin) e-mail: ssh-keygen -t rsa -b 4096 -C "your_email@example.com"
3. When prompted to enter a file name leave blank and press ENTER
4. When prompted to enter a PASSPHRASE leave blank and press ENTER (twice)
5. Search for the file created with the name "id_rsa"
6. Notice that two files have been created private and public in the .ssh folder
7. Open the public file and copy the entire contents of the file
8. In Github to the TTAHUB project and click 'Settings' in the top right corner
9. Under 'Security' click 'Deploy Keys' then 'Add deploy Key'
10. Give the key a name 'TTAHUB' and paste the private key contents, CHECK 'Allow write access' then click 'Add Key'
11. Open the private key file that was created and copy the entire contents of the file
12. Go to CircleCi and open the 'Head-Start-TTADP' project
13. Click 'Project settings' in the top right corner
14. Click 'SSH keys' and scroll down to the section 'Additional SSH Keys'
15. Click 'Add SSH Key', in 'Hostname' enter github.com then paste the contents of the private file in 'Private Key' section
16. Click 'Add SSH Key'

#### Continuous Deployment (CD)

This application consists of three deployment environments: development/dev, staging, and
production/prod. The CD pipeline is configured via CircleCi.
The bulk of CD configurations can be found in this repo's [.circleci/config.yml](.circleci/config.yml) file,
the [application manifest](manifest.yml) and the environment specific [deployment_config](deployment_config/)
variable files.

Commits to specific branches in github repositories start automatic deployments as follows:

- **Dev** deployed by latest push to any remote branch of HHS/Head-Start-TTADP repo
- **Staging** deployed by commit to [main branch][hhs-main] of HHS/Head-Start-TTADP repo
- **Prod** deployed by commit to [production branch][hhs-prod] of HHS/Head-Start-TTADP repo

The application is deployed to the following URLs:

| Environment | URL                                         |
| :---------- | :------------------------------------------ |
| sandbox     | https://tta-smarthub-sandbox.app.cloud.gov/ |
| dev         | https://tta-smarthub-dev.app.cloud.gov/     |
| staging     | https://tta-smarthub-staging.app.cloud.gov/ |
| prod        | https://ttahub.ohs.acf.hhs.gov              |

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
- The application `JWT_SECRET`.
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

   You're all done with public env variables! In sandbox, `process.env.PUBLIC_VEGGIE` will be `"spinach"`. In dev, `process.env.PUBLIC_VEGGIE` will be `"dill"`. 🎉

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

   You're all done! In sandbox, `process.env.SECRET_FRUIT` will be `"strawberry"`. In dev, `process.env.SECRET_FRUIT` will be `"dewberry"`. 🎉

### Interacting with a deployed application or database

Read [TTAHUB-System-Operations](https://github.com/HHS/Head-Start-TTADP/wiki/TTAHUB-System-Operations) for information on how production may be accessed.

Our project includes four deployed Postgres databases, one to interact with each application environment (sandbox, dev, staging, prod). For instructions on how to create and modify databases instances within the cloud.gov ecosystem see the [terraform/README.md](terraform/README.md).

#### First, log into Cloud Foundry instance

1. Install **Version 7** of the Cloud Foundry CLI tool

   - On MacOS: `brew install cloudfoundry/tap/cf-cli@7`
   - On other platforms: [Download and install cf][cf-install]. Be sure to get version 7.x

1. Login to cloud.gov account

   ```bash
   cf login -a api.fr.cloud.gov --sso
   # follow temporary authorization code prompts
   ```

1. Follow prompts to target the desired space

#### Second, choose an interaction method

##### Option A: Run psql commands directly

1. If you haven't used the the cloud foundry plugin [cf-service-connect][cf-service-connect] before, install it now

   ```bash
   # Example install for macOS
   cf install-plugin https://github.com/cloud-gov/cf-service-connect/releases/download/1.1.0/cf-service-connect-darwin-386
   ```

1. Connect to your desired database

   ```bash
   cf connect-to-service <app_name> <service_instance_name>
   # Example for sandbox
   cf connect-to-service tta-smarthub-sandbox ttahub-sandbox
   ```

   On success, your terminal prompt will change to match the `db_name` from the database instance credentials.
   This indicates you are in an open psql session, the command-line interface to PostgreSQL.

##### Option B: Run script as task

1. Use [cf run-task][cf-run-task] command

   ```bash
   cf run-task <app_name> --command "<yarn command>"
   # Example 1: running data validation script against sandbox
   cf run-task tta-smarthub-sandbox --command "yarn db:validation"
   # Example 2: undo most recent database migration
   cf run-task tta-smarthub-sandbox --command "yarn db:migrate:undo:prod:last"
   ```

1. Check log output, including those from task

   ```bash
   cf logs <app_name> --recent
   # Example 1: checking sandbox logs
   cf logs tta-smarthub-sandbox --recent
   # Example 2: checking sandbox logs, grep just for task logs
   cf logs tta-smarthub-sandbox --recent | grep APP/TASK/
   ```

##### Option C: Run script in an interactive shell

1. If on prod, enable shh in space first

   ```bash
   cf allow-space-ssh ttahub-prod
   ```

1. Ssh into your desired application (to see application names run `cf apps`)

   ```bash
   cf ssh <app_name>
   # ssh example for sandbox application
   cf ssh tta-smarthub-sandbox
   ```

1. Open shell

   ```bash
   /tmp/lifecycle/shell
   ```

1. Run your desired command

   ```bash
   # example
   node ./build/server/src/tools/dataValidationCLI.js
   ```

1. If on prod, disable ssh in space

   ```bash
   cf disallow-space-ssh ttahub-prod
   ```

##### Example: Manual import of Monitoring data

Importing Monitoring data without the automation uses Option C above across several step and is described further on in the [tools README](https://github.com/HHS/Head-Start-TTADP/tree/main/src/tools).

### Taking a production backup via CircleCI

We can quickly take a production backup via the CircleCI web interface. To do so, go to the `production` branch there and trigger a pipeline with the variable `manual-trigger` set to true. You can then retrieve this backup with the script `bin/latest_backup.sh`.

### Refreshing data in non-production environments

In order to keep the non-production environments as close to production as possible we developed a way to transform a restored
version of the production database locally if using local database. The script can be run using the following:

```
	yarn processData:local

```

The transformed database can then be restored in the non-production environments.
For details on how to perform a backup and restore, there is information on the cloud.gov site:

<https://cloud.gov/docs/management/database-backup-restore/>

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

If you are not logged into the cf cli, it will ask you for an sso temporary password. You can get a temporary password at https://login.fr.cloud.gov/passcode. The application will stay in maintenance mode even through deploys of the application. You need to explicitly run `./bin/maintenance -e ${env} -m off` to turn off maintenance mode.

## Updating node

To update the version of node the project uses, the version number needs to be specified in a few places. Cloud.gov only supports certain versions of node; you can find supported versions [on the repo for their buildpack](https://github.com/cloudfoundry/nodejs-buildpack/releases).

Once you have that version number, you need to update it in the following files

- .circleci/config.yml
- .nvmrc
- Dockerfile
- package.json
- frontend/package.json

You should also update it where it is specified this README file.

You would then need to rebuild the relevant browser images (docker will likely need to pull new ones) and run `yarn docker:deps` to rebuild your dependencies.
If you are using NVM, you can set intall a new node version with `nvm install VERSION` and set it to be the default version of node via `nvm alias default VERSION`.

## Removing, creating and binding a service from the command line

In the past, we've needed to destroy and recreate particular services (for example, redis). This can be done through the Cloud.gov UI, through the Terraform architecture, and through the cloud foundry command line interface. The following are instructions for using the cloud foundry CLI (`cf`) for this.

- Login and target the environment you wish to make changes to. (`cf login --sso`).
- You can use `cf services` to list your services
- Remember that you can use `cf help COMMAND` to get the documentation for a particular command

To delete and recreate a service (this should not be done lightly, as it is a destructive action)

1 Unbind a service:
`cf us APP_NAME SERVICE`
ex:
`cf us tta-smarthub-staging ttahub-redis-staging`

2 Delete a service:
`cf ds SERVICE`
ex:
`cf ds ttahub-redis-staging`

3 Create a service:
`cf cs SERVICE_TYPE SERVICE_LABEL SERVICE`
ex:
`cf cs aws-elasticache-redis redis-dev ttahub-redis-staging`

4 Bind a service:
`cf bs APP_NAME SERVICE`
ex:
`cf bs ttahub-smarthub-staging ttahub-redis-staging`

5. Trigger a redeploy through the Circle CI UI (rather than restaging)

6. Finally, you may need to reconfigure the network policies to allow the app to connect to the virus scanning api. Check your network policies with:
   `cf network-policies`
   If you see nothing there, you'll need to add an appropriate policy.
   `cf add-network-policy tta-smarthub-APP_NAME clamav-api-ttahub-APP_NAME --protocol tcp --port 9443`
   ex:
   `cf add-network-policy tta-smarthub-dev clamav-api-ttahub-dev --protocol tcp --port 9443`
   You may need to connect across spaces (for example, our clamav-api-ttahub-dev app is shared by all of our ephemeral environments). If so, use the -s flag.
   ex:
   `cf add-network-policy tta-smarthub-staging -s ttahub-dev clamav-api-ttahub-dev --protocol tcp --port 9443`

<!-- Links -->

[Current tech stack](./tech-stack.md)

[hhs-main]: https://github.com/HHS/Head-Start-TTADP/tree/main
[TTAHUB-System-Operations]: https://github.com/HHS/Head-Start-TTADP/wiki/TTAHUB-System-Operations
[circleci-envvar]: https://app.circleci.com/settings/project/github/HHS/Head-Start-TTADP/environment-variables?return-to=https%3A%2F%2Fcircleci.com%2Fdashboard
[cloudgov]: https://dashboard.fr.cloud.gov/home
[cloudgov-deployer]: https://cloud.gov/docs/services/cloud-gov-service-account/
[cf-install]: https://docs.cloudfoundry.org/cf-cli/install-go-cli.html
[cf-run-task]: https://docs.cloudfoundry.org/devguide/using-tasks.html#run-tasks-v7
[cf-service-connect]: https://github.com/cloud-gov/cf-service-connect
[hhs-main]: https://github.com/HHS/Head-Start-TTADP/tree/main
[hhs-prod]: https://github.com/HHS/Head-Start-TTADP/tree/production
[frontend]: http://localhost:3000
[backend]: http://localhost:8080
[API documentation]: http://localhost:5003
[minio]: http://localhost:3000
