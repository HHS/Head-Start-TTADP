# @ttahub/common

This is a CommonJS package and thus no build step is required.

## Installation

```bash
yarn add @ttahub/common
```

## Developers

Whenever changes to this package are made, you will need to:

- Bump the version in `package.json`.
- Publish the latest version of the package to npm by running `npm publish` in this directory. There is also a yarn task in the root of the TTAHUB app you can run ```yarn publish:common```

If your PR depends on the latest version of this package, please don't forget to run `yarn upgrade @ttahub/common` and commit the changes to `package.json` and `yarn.lock`.

## Versions
### 1.1.8
Reorder training report url param statuses so suspended is third tab and not second on TR landing

### 1.1.6/7
Add suspended as an option to training report URL params and status

### 1.1.4
Distinguish between training report url params and training report statuses

### 1.1.3
Add "event target populations"

###  1.1.2
#### 1.1.1 
- Add COLLABORATOR_TRAINING_REPORTS permissions



