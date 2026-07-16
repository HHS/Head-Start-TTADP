# 0028. Share TypeScript types through `packages/common`

## Status

Accepted

## Context

The monorepo already shares runtime constants and utilities through `@ttahub/common`, a CommonJS package published to npm and consumed by both the backend and frontend. Typed interfaces for models, API payloads, and service contracts have been accumulating in ad-hoc per-domain `types.ts` files such as `src/goalServices/types.ts` and `src/scopes/types.ts`. Those definitions do not have a single shared home, and they are not directly accessible to the frontend.

We need a single, shared home for these cross-cutting types that is directly usable from both backend and frontend code, without introducing a build or install mechanism that could fail in any of our deployment environments — including Cloud.gov, where our production and staging environments run.

## Decision

Shared TypeScript types live in `packages/common`, as `.d.ts` overlay files placed next to the runtime `.js` files they describe (for example, `packages/common/src/notifications.d.ts` overlays the notification-related exports in `packages/common/src/index.js`).

- No separate types-only package is introduced. `@ttahub/common` is the single package shared between backend and frontend for both runtime values and type definitions.
- Consumers use `import type { ... } from '@ttahub/common'` (or the deep path `@ttahub/common/src/constants` where a literal/`as const` type is needed and only the deep `.d.ts` overlay provides it).
- Type-only `.d.ts` files in `packages/common/src` must stay in sync with the runtime `.js` files they describe; there is no automated generation step.
- Because `@ttahub/common` is an ordinary npm-published dependency, shared type changes follow the same version-bump-and-publish workflow as runtime changes (`bin/update-common-version`), with no additional linking or build-context steps required in any environment, including Cloud.gov.

## Consequences

Shared types can be added or updated by editing `packages/common/src/*.d.ts` alongside the corresponding runtime code, keeping a single source of truth for both the value and its type.

Type-only changes require the same version bump and publish step as runtime changes to `@ttahub/common`. This is more overhead than a locally-linked, types-only package would offer, but it is a well-understood workflow that is already proven to work across all of our environments, including Cloud.gov.

The package also introduces a constraint:

- Any `.d.ts` overlay in `packages/common/src` must be kept in sync with its corresponding runtime `.js` file, since there is no automated generation step tying the two together.
