# @ttahub/common

This is a CommonJS package and thus no build step is required. There are no dependencies and thus no installation step is required. These are deliberate choices to simplify usage both locally and in CI.

# Usage

Whenever changes to this package are made, you will need to:

- Bump the version in `package.json`.
- Run `yarn deps` in the repo root.

When the version is bumped, the `yarn install` (called by `yarn deps`) will see that this package's version is more recent than what currently exists in `node_modules`. It should then pull in the latest version to both projects.
