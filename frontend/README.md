# TTADP Frontend

## Getting Started

This project uses [docker](https://docs.docker.com/get-docker/) and [make](https://www.gnu.org/software/make/) to provide a simple unified environment for all developers. To get started:

 1. Make sure you have docker installed
 2. Run `make init`. This will build the development docker image and install the project's dependencies
 3. Run `make start`. This fires up a development server that reloads with code updates

### Other Targets

| Target | Description |
|-|-|
| `make test` | Start the test watcher |
| `make build` | Build a production bundle |
| `make lint` | Run the linter |
| `make lint-fix` | Have the linter fix issues it can fix automatically |
| `make serve` | Build a production bundle and serve that bundle from `localhost:5000` |
| `make shell` | Get a shell into the developer docker container. Sometimes useful to help debug build environment issues |
| `make clean` | Remove the build directory |
| `make ci` | Run all "ci" targets. These include `test-ci`, `lint-ci`, `audit` and `zap` |
| `make test-ci` | Run tests as a single run creating coverage and test result reports. Test reports can be found in `reports/unit.xml`. Coverage is in the `coverage` folder (I couldn't find an easy way to change the coverage directory) |
| `make lint-ci` | Run the linter creating a report in `reports/lint.xml` |
| `make audit` | Run `yarn audit` failing if any dependency has a moderate or higher vulnerability |
| `make zap` | Run `script/zap.sh` which launches [zap](https://www.zaproxy.org/) against a production bundle. Outputs a report to `reports/zap.html` |

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: https://facebook.github.io/create-react-app/docs/code-splitting

### Analyzing the Bundle Size

This section has moved here: https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size

### Making a Progressive Web App

This section has moved here: https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app

### Advanced Configuration

This section has moved here: https://facebook.github.io/create-react-app/docs/advanced-configuration

### Deployment

This section has moved here: https://facebook.github.io/create-react-app/docs/deployment

### `yarn build` fails to minify

This section has moved here: https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify
