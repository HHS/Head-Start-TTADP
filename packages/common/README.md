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

If your PR depends on the latest version of this package, please don't forget to run `yarn upgrade @ttahub/common` (in BE and FE) and commit the changes to `package.json` (all 3: ./package.json, ./frontend/package.json, ./packages/common/package.json) and `yarn.lock` (BE and FE).

Note: On Windows you will need to use `yarn add @ttahub/common@1.x.0` to update the package.json file's.

## Versions

## 2.0.19
Add "escapeHTML" function

## 1.4.0 
Add SUPPORT_TYPE

### 1.1.9/1.2.0
(Sorry for the multiple versions) Update the name of the const COLLABORATOR_TRAINING_REPORTS to POC_TRAINING_REPORTS

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



