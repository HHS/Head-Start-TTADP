# @ttahub/common

This is a CommonJS package and thus no build step is required.

## Installation

```bash
yarn add @ttahub/common
```

## Developers

Whenever changes to this package are made, you will need to:

- Bump the version in `package.json`.
- Publish the latest version of the package to npm with `npm publish`.

If your PR depends on the latest version of this package, please don't forget to run `yarn upgrade @ttahub/common` and commit the changes to `package.json` and `yarn.lock`.
