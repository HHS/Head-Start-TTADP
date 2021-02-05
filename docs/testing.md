# Testing

## Tips and Caveats when writing tests


### Handling async/promises

When writing tests that rely on asynchronous operations, such as writing to the database, take care to make sure that those operations are resolved before any tests that rely on them run. If you need to create database records in a setup function such as `beforeAll`, you will want to make sure all async/promise operations resolve before subsequent tests run. You can make sure multiple await (promise) operations resolve by using [`Promise.all()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all) (which takes an iterable of promises).

Here's how that might look:

```
let a = someAsyncFun();
let b = anotherAsyncFun();

return Promise.all([a, b]);
```

### Creating/deleting database records

Some tests will require interactions with the database, but at present all tests run using the same instance of the database. That means that any records you create or delete can potentially affect tests elsewhere. On top of that, tests run in parallel, so database operations may run in an unexpected order. That can mean tests may pass various times only to fail due to missing or unexpected records in the database when your tests run.

To mitigate issues with missing or unexpected records causing failing tests, you can try a few approaches. One approach is to avoid using the database if your test doesn't actually require it. You may be able to use mock models or responses rather than interact with the database. If your test does require the database, you should create the records you need before your tests run and delete the records you created (and no others) when your tests finish. If you `Model.create`, make sure you `Model.destroy()` the records you created.

When writing tests that create database records, it might also help to use a `try...catch` to catch errors in database transactions and log meaningful output. Sequelize error messages can be vague, and it might help others to see more informative messages.

## Testing in Docker

### Using `./bin/run-tests`

To simplify running tests in Docker, there is a bash script, `./bin/run-tests` that will run the appropriate commands to start `test-` variations of the services used in tests. You should be able to run tests using that command while your development Docker environment is running. The script uses a separate `docker-compose.test.yml` which does not create a user-accessible network and cleans up after itself once tests have run.

By default, `./bin/run-tests` will run both backend and frontend tests. If you want to run only one set of tests, supply 'frontend' or 'backend' as a parameter. So to run only the backend tests, you'd run `./bin/run-tests backend`.

### Running tests in your development Docker environment

When running tests in Docker, be aware that there are tests that will modify/delete database records. For tests to run, the 'db' service needs to exist and `db:migrate` and `db:seed` need to have been run (to create the tables and populate certain records).

In the `docker-compose.yml` configuration, the database is set up to persist to a volume, "dbdata", so database records will persist between runs of the 'db' service, unless you remove that volume explicitly (e.g. `docker volume rm` or `docker-compose down --volumes`).


### Notes on docker-compose and multiple configurations

`docker-compose` has a feature for providing multiple `docker-compose.*.yml` files where subsequent files can override settings in previous files, which sounds like it would suit the use case of running docker for local development and for testing. However, the ability to [override configurations](https://docs.docker.com/compose/extends/#adding-and-overriding-configuration) is limited. While experimenting with overrides, it became clear that doing so would require a minimum of three docker-compose.yml files: one "base", one for local development, one for running tests. Trying to compose docker-compose.yml files would be complicated.

In addition, while experimenting with multiple configuration files, it became clear that docker was unable to differentiate between different versions of the same service. Trying to override the 'db' service for testing would not work as expected: if the local/dev 'db' service had already been created, that one would be used when tests were run.
