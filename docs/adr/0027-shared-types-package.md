# 0027. Add `packages/types` as a locally-linked, types-only TypeScript package

## Status

Accepted

## Context

The monorepo already shares runtime constants and utilities through `@ttahub/common`, a CommonJS package published to npm. That works for stable runtime code, but it creates too much friction for TypeScript type definitions that evolve during normal feature work: every change requires a version bump, `npm publish`, and `yarn upgrade` in both backend and frontend consumers.

At the same time, typed interfaces for models, API payloads, and service contracts have been accumulating in ad-hoc per-domain `types.ts` files such as `src/goalServices/types.ts` and `src/scopes/types.ts`. Those definitions do not have a single shared home, and they are not directly accessible to the frontend.

## Decision

We will introduce `packages/types` as a shared, types-only TypeScript package published in the repository as `@ttahub/types`.

- The package is never published to npm and must remain `"private": true`.
- It is linked locally with Yarn's `link:` protocol:
  - root `package.json`: `"@ttahub/types": "link:./packages/types"`
  - `frontend/package.json`: `"@ttahub/types": "link:../packages/types"`
- The package entry point is `src/index.ts`.
- There is no compilation step; consumers import directly from source.
- Consumers must use `import type { ... } from '@ttahub/types'`.
- Runtime constants and utilities remain in `packages/common`.
- We are not introducing Yarn workspaces; the frontend keeps its isolated `node_modules` and separate install step.

Because TypeScript strips type-only imports from emitted JavaScript, `@ttahub/types` does not need to produce runtime artifacts.

## Consequences

Shared types can now be updated by editing `packages/types/src/*.ts`, and those changes are immediately available to both backend and frontend consumers without any publish step.

This removes package version churn for type-only changes and makes it easier to converge on shared model, API, and service contract definitions during feature work.

The package also introduces hard constraints:

- `packages/types` must remain types-only.
- Any runtime value such as a constant, function, or class must live in `packages/common` instead.
- Dockerfile build contexts must copy `packages/` before running `yarn install`, or the `link:` target will not resolve.
- Consumers must use `import type`; a plain value import may type-check but will fail at runtime because `packages/types` does not emit JavaScript.
