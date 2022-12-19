# Usage

After changing anything in this package, be sure to run `yarn common:reinstall` in the TTAHUB project's root directly.

This will:

1. Build `@ttahub/common`
2. Remove and reinstall for the backend.
3. Remove and reinstall for the frontend.

Afterwards, you may have to restart your language server for your editor to pick up the new definitions.
