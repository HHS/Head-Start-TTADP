# @ttahub/common

> Shared TypeScript notification types now ship with `@ttahub/common` in `src/notifications.d.ts`. Use `import type` from `@ttahub/common/src/notifications`.

This is a CommonJS package and thus no build step is required.

## Installation

```bash
yarn add @ttahub/common
```

## Developers

Whenever changes to this package are made, you will need to:
- Bump the version in `package.json`.
- Publish the latest version of the package to npm by running `npm publish` in this directory. There is also a yarn task in the root of the TTAHUB app you can run `yarn publish:common`

If your PR depends on the latest version of this package, please don't forget to run `yarn upgrade @ttahub/common` (in BE and FE) and commit the changes to `package.json` (all 3: ./package.json, ./frontend/package.json, ./packages/common/package.json) and `yarn.lock` (BE and FE).

Note: On Windows you will need to use `yarn add @ttahub/common@1.x.0` to update the package.json file's.

## Versions

## 2.4.28

Splits a TTA request's reviewers from its approvers in `src/ttaRequests.d.ts`: the response
declares `reviewers` (`TtaRequestReviewerData`) beside `approvers` (`TtaRequestApproverData`),
and neither has a `step` any more.

## 2.4.27

Adds `TTA_REQUEST_STATUSES.AWAITING_APPROVAL`, `TTA_REQUEST_NOTE_ACTIONS.SENT_FOR_APPROVAL`,
`TTA_REQUEST_MAX_ASSIGNED_STAFF` and `TTA_REQUEST_ASSIGNABLE_ROLES`, and declares the assigned staff,
the approving COR and the send-to-COR review in `src/ttaRequests.d.ts`.

## 2.4.26

Adds `TTA_REQUEST_STATUSES.NEEDS_ACTION`, `TTA_REQUEST_STEPS` and `TTA_REQUEST_NOTE_ACTIONS`, and
declares the TTA request review payload, notes and approvers in `src/ttaRequests.d.ts`. Built on
the published 2.4.25, so it keeps the timeline keyset cursor (`cursor`, `nextCursor`) declarations
in `src/recipientTimeline.d.ts`; 2.4.24 was published with no changes from 2.4.23.

## 2.4.23

Merges 2.4.22 (`NOTIFICATION_TYPES.TRAINING_REPORT_SESSION_NEEDS_ACTION_COLLABORATOR`) with the
TTA request scopes and `MUTUALLY_EXCLUSIVE_SCOPES` from 2.4.21.

## 2.4.21

Adds the TTA request scopes to `SCOPE_IDS` (`READ_WRITE_TTA_REQUESTS`, `REVIEW_TTA_REQUESTS`,
`APPROVE_TTA_REQUESTS`, `BACKUP_APPROVE_TTA_REQUESTS`) and `MUTUALLY_EXCLUSIVE_SCOPES`, the pairs
of scopes a user can't hold together in one region. Built on 2.4.20.

## 2.4.20

Reconciles the published 2.4.15–2.4.19 releases without dropping their shared contracts:
- TTA request constants and request/response declarations from 2.4.15.
- Session-submission collaborator notifications, preference keys, and notification `sessionName` from 2.4.16.
- Collaboration-report constants and declarations from 2.4.17 and 2.4.19.
- Timeline view and category declarations from 2.4.18.

Before publishing a new version, compare its source against intervening published releases as
well as the current branch. A newer version number alone does not guarantee those changes
are present in the checkout. Keep runtime constants and their declaration overlays together.

# 2.4.0

Added new FEI statuses

# 2.3.0

Include shared notification TypeScript types in `@ttahub/common` to replace `@ttahub/types` link-based usage.

# 2.2.26

Add additional trace IDs

# 2.2.21

Add additional trace IDs

# 2.2.18

Added indicator names.

# 2.2.14

Added two new topics.

# 2.2.11

Remove duplicate goal close reason.

# 2.2.10

Change the values for "why was the activity conducted?".

# 2.2.9

Added activity report "why was the activity conducted?" values.

# 2.2.7

Additional variations of disallowed ECLKC and HeadStart URLS.

# 2.2.3

Target population and reason changes

## 2.2.2

Change ECLKC to headstart.gov.

## 2.1.6

Remove constants related to ElasticSearch.

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

### 1.1.2

#### 1.1.1

- Add COLLABORATOR_TRAINING_REPORTS permissions
