# Testing

## Running Tests

### Testing With Docker

If switching branches for code review, run `yarn docker:reset` before running your tests.

Run `yarn docker:test` to run all tests for the frontend and backend.

To only run the frontend tests run `yarn docker:test frontend`.

To only run the backend tests run `yarn docker:test backend`.

Migrations and seeding of the test db occurs within the script run by the `docker:test` command.

To run Biome linting, run `yarn lint:all` or `yarn lint:fix:all` to have Biome attempt to fix linting and formatting problems.

> [!NOTE]
> You may run into some issues running the docker commands on Windows:
>
> - If you run into `Permission Denied` errors see [this issue](https://github.com/docker/for-win/issues/3385#issuecomment-501931980)
> - You can try to speed up execution time on windows with solutions posted to [this issue](https://github.com/docker/for-win/issues/1936)

#### Using `./bin/run-tests`

To simplify running tests in Docker, there is a bash script, `./bin/run-tests` that will run the appropriate commands to start `test-` variations of the services used in tests. You should be able to run tests using that command while your development Docker environment is running. The script uses a separate `docker-compose.test.yml` which does not create a user-accessible network and cleans up after itself once tests have run.

This script is written such that it will log errors, but won't exit if a docker command fails. It will count the number of errors and the number of errors will be the exit code (`$?`) for the script. So if three docker commands fail, the exit code would be 3.

By default, `./bin/run-tests` will run both backend and frontend tests. If you want to run only one set of tests, supply 'frontend' or 'backend' as a parameter. So to run only the backend tests, you'd run `./bin/run-tests backend`.

#### Note: Database Records in Docker

When running tests in Docker, be aware that there are tests that will modify/delete database records. For tests to run, the 'db' service needs to exist and `db:migrate` and `db:seed` need to have been run (to create the tables and populate certain records).

In the `docker-compose.yml` configuration, the database is set up to persist to a volume, "dbdata", so database records will persist between runs of the 'db' service, unless you remove that volume explicitly (e.g. `docker volume rm` or `docker compose down --volumes`).

#### Note: Docker Compose & Multiple Configurations

`docker compose` has a feature for providing multiple `docker-compose.*.yml` files where subsequent files can override settings in previous files, which sounds like it would suit the use case of running docker for local development and for testing. However, the ability to [override configurations](https://docs.docker.com/compose/extends/#adding-and-overriding-configuration) is limited. While experimenting with overrides, it became clear that doing so would require a minimum of three docker-compose.yml files: one "base", one for local development, one for running tests. Trying to compose docker-compose.yml files would be complicated.

In addition, while experimenting with multiple configuration files, it became clear that docker was unable to differentiate between different versions of the same service. Trying to override the 'db' service for testing would not work as expected: if the local/dev 'db' service had already been created, that one would be used when tests were run.

### Running Tests Natively

**Backend:**

```bash
yarn test build/server/src/example.test.js  # Run single backend test (includes build)
yarn test                                   # Run all backend tests (includes build)
```

**Frontend:**
```bash
yarn --cwd frontend test -- SomeComponent   # Run specific test
yarn --cwd frontend test                    # Run all frontend tests
```

**All Tests:**
```bash
yarn test:all        # Run both backend and frontend tests
```

## Writing Tests

### Handling async/promises

When writing tests that rely on asynchronous operations, such as writing to the database, take care to make sure that those operations are resolved before any tests that rely on them run. If you need to create database records in a setup function such as `beforeAll`, you will want to make sure all async/promise operations resolve before subsequent tests run. You can make sure multiple await (promise) operations resolve by using [`Promise.all()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all) (which takes an iterable of promises).

Here's how that might look:

```javascript
let a = someAsyncFun();
let b = anotherAsyncFun();

return Promise.all([a, b]);
```

### Advancing Timers

Playwright doesn't support advancing timers (yet). There is an issue being tracked for this [here](https://github.com/microsoft/playwright/issues/6347). Until it is supported, we can use the workaround proposed in [one of the comments](https://github.com/microsoft/playwright/issues/6347#issuecomment-965887758).

This could be useful for testing behaviors that rely on our autosave logic.

`sinon` is already a project dependency, and a helper for adding it to `window` lives in `tests/e2e/common.ts` so we can use it to advance timers like this within a test:

```ts
import { test, expect } from '@playwright/test';
import { useClock } from './common';

useClock(test);

test('advance time', async ({ page }) => {
  await page.evaluate(() => (window as any).__clock.tick(120_000));
});
```

## Database State Management

Some tests will require interactions with the database, but at present all tests run using the same instance of the database. That means that any records you create or delete can potentially affect tests elsewhere. On top of that, tests run in parallel, so database operations may run in an unexpected order. That can mean tests may pass various times only to fail due to missing or unexpected records in the database when your tests run.

To mitigate issues with missing or unexpected records causing failing tests, you can try a few approaches. One approach is to avoid using the database if your test doesn't actually require it. You may be able to use mock models or responses rather than interact with the database. If your test does require the database, you should create the records you need before your tests run and delete the records you created (and no others) when your tests finish. If you `Model.create`, make sure you `Model.destroy()` the records you created.

When writing tests that create database records, it might also help to use a `try...catch` to catch errors in database transactions and log meaningful output. Sequelize error messages can be vague, and it might help others to see more informative messages.

### Database Testing Gotchas

It's important that our tests fully clean up after themselves if they interact with the database. This way, tests do not conflict when run on the CI and remain as deterministic as possible. The best way to do this is to run them locally in an isolated environment and confirm that they are sanitary.

With that in mind, there a few "gotchas" to remember to help write sanitary tests.

- `Grant.destroy` needs to run with `individualHooks: true` or the related GrantNumberLink model prevents delete. Additionally, the hooks on destroy also update the materialized view (GrantRelationshipToActive).
- When you call `Model.destroy` you should be adding `individualHooks: true` to the Sequelize options. Often this is required for proper cleanup. There may be times when this is undesirable; this should be indicated with a comment.
- Be aware of paranoid models. For those models: force: true gets around the soft delete. If they are already soft-deleted though, you need to remove the default scopes paranoid: true does it, as well as Model.unscoped()
- There are excellent helpers for creating and destroying common Model mocks in `testUtils.js`. Be aware that they take a scorched earth approach to cleanup. For example, when debugging a flaky test, it was discovered that `destroyReport` was removing a commonly used region.
- The next section details additional tools, found in `src/lib/programmaticTransaction.ts`, which make maintaining a clean database state when writing tests a breeze.

### Snapshot Helpers (`captureSnapshot` / `rollbackToSnapshot`)

The `captureSnapshot` and `rollbackToSnapshot` functions from `src/lib/programmaticTransaction.ts` manage database state during automated testing with Jest. These functions ensure that each test is executed in a clean state, preventing tests from affecting each other and improving test reliability.

**Functions Overview:**

- **`captureSnapshot()`**: Captures the current state of the database, specifically the maximum IDs from specified tables, which is used to detect and revert changes.
- **`rollbackToSnapshot(snapshot: MaxIdRecord[])`**: Uses the snapshot taken by `captureSnapshot()` to revert the database to its state at the time of the snapshot. This is crucial for cleaning up after tests that alter the database.

**Example 1: Using `beforeAll` and `afterAll`**

`captureSnapshot` and `rollbackToSnapshot` are used at the Jest suite level to manage database states before and after all tests run. This is useful when tests are not independent or when setup/teardown for each test would be too costly.

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

**Example 2: Using at the Beginning and End of Each Test Case**

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

## Coverage Reports

On the frontend, the lcov and HTML files are generated as normal, however on the backend, the folders are tested separately. The command `yarn coverage:backend` will concatenate the lcov files and also generate an HTML file. However, this process requires `lcov` to be installed on a user's computer. On Apple, you can use Homebrew - `brew install lcov`. On a Windows machine, your path may vary, but two options include WSL and [this chocolatey package](https://community.chocolatey.org/packages/lcov).

Another important note for running tests on the backend - we specifically exclude files on the backend that follow the `*CLI.js` naming convention (for example, `adminToolsCLI.js`) from test coverage. This is meant to exclude files intended to be run in the shell. Any functionality in these files should be imported from a file that is tested. The `src/tools` folder is where these files have usually lived and there are lots of great examples of the desired pattern in that folder.

### Uncovered Lines on PR Builds

The uncovered lines on PR is generated by finding the intersection between the jest generated coverage file with the git change list for the PR. The additional set of artifacts is generated to aid in providing test coverage for each PR.

- `coverage/coverage-final.json` - Only on test_backend, all the distinct jest run outputs are consolidated into a unified coverage-final.json file.
- `uncovered-lines/uncovered-lines.html` - A human readable structure identifying all the lines from this PR that are uncovered by jest tests.
- `uncovered-lines/uncovered-lines.json` - A json structure identifying all the lines from this PR that are uncovered by jest tests.

This can be configured to fail builds by either permanently changing or overriding the pipeline parameter `fail-on-modified-lines` to true (defaults to false).

## API Tests

API tests use Playwright for making requests and Joi for validating responses. They run alongside the rest of the end-to-end tests during the same stage in CI.

`tests/api/common.ts` contains common helpers for making requests and doing validations.

**Basic pattern:**

```typescript
import { test, expect } from '@playwright/test';
import Joi from '@hapi/joi';
import { root, validateSchema } from './common';

test('get /endpoint', async ({ request }) => {
  const response = await request.get(`${root}/endpoint`);

  const schema = Joi.array().items(
    Joi.object({
      key: Joi.string().valid(
        'keyA',
        'keyB',
        'keyC',
      ).required(),
      value: Joi.string().valid('valA', 'valB', 'valC').required(),
    })
  );

  await validateSchema(response, schema, expect);
});
```

## E2E Tests (Playwright)

### First-time Setup

Run `npx playwright install` to download browser dependencies.

Install the Playwright VS Code extension for a convenient `Testing` tab in the sidebar where you can run tests and see results: https://marketplace.visualstudio.com/items?itemName=ms-playwright.playwright

### Test Generator

See the [official docs](https://playwright.dev/docs/codegen) for the test generator.

When you have installed the extension and navigate to the `Testing` tab, you should see a `Record new` button near the bottom. Clicking on this button will:

- Create a new test file in the `tests` directory
- Open a new browser window
- Start recording your interactions with the browser

When you're done, close the browser and the recorder will stop recording. You will likely need to do some cleanup of the generated test file, but it's a great way to get started.

### Running E2E Tests

```bash
yarn e2e             # Playwright E2E tests
yarn e2e:api         # Playwright API tests
yarn cucumber        # Cucumber BDD tests
```
