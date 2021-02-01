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


## Testing in Docker

When running tests in Docker, be aware that there are tests that will modify/delete database records. For tests to run, the 'db' service needs to exist and `db:migrate` and `db:seed` need to have been run (to create the tables and populate certain records).

In the `docker-compose.yml` configuration, the database is set up to persist to a volume, "dbdata", so database records will persist between runs of the 'db' service, unless you remove that volume explicitly (e.g. `docker volume rm` or `docker-compose down --volumes`).


### Notes on docker-compose and multiple configurations

`docker-compose` has a feature for providing multiple `docker-compose.*.yml` files where subsequent files can override settings in previous files, which sounds like it would suit the use case of running docker for local development and for testing. However, the ability to [override configurations](https://docs.docker.com/compose/extends/#adding-and-overriding-configuration) is limited. While experimenting with overrides, it became clear that doing so would require a minimum of three docker-compose.yml files: one "base", one for local development, one for running tests. Trying to compose docker-compose.yml files would be complicated.

In addition, while experimenting with multiple configuration files, it became clear that docker was unable to differentiate between different versions of the same service. Trying to override the 'db' service for testing would not work as expected: if the local/dev 'db' service had already been created, that one would be used when tests were run.
