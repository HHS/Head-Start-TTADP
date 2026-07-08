# @ttahub/types

Shared TypeScript type definitions for the TTA Smart Hub. This package is **types-only** and is **never published to npm**.

## Key Constraints

| Rule | Why |
|---|---|
| **Types only** — no `const`, `function`, or other value exports | There is no compiled `.js` output. Any runtime value would fail to resolve in production builds. |
| **Never published to npm** | Locally linked via Yarn `link:` protocol. Do not run `npm publish` or `yarn publish` from this directory. |
| **Use `import type`** | TypeScript strips type-only imports at compile time, so no runtime resolution of this package ever occurs. |

For shared **runtime constants and utilities**, use [`@ttahub/common`](../common/README.md) instead.

> **Architecture Decision:** See [`docs/adr/0027-shared-types-package.md`](../../docs/adr/0027-shared-types-package.md) for the rationale behind this package.

---

## How It's Linked

This package is wired into the monorepo via Yarn's `link:` protocol — no npm publish, no version bumps.

**Backend (`package.json` at repo root):**
```json
"@ttahub/types": "link:./packages/types"
```

**Frontend (`frontend/package.json`):**
```json
"@ttahub/types": "link:../packages/types"
```

After running `yarn install` (BE) and `yarn --cwd frontend install` (FE), both `node_modules/@ttahub/types` entries will be symlinks pointing to this directory.

---

## Adding a New Type

1. Create a new `.ts` file under `src/` (e.g., `src/goals.ts`).
2. Define and export your types:
   ```ts
   export type GoalStatus = 'In Progress' | 'Closed' | 'Not Started';
   ```
3. Re-export from `src/index.ts`:
   ```ts
   export type { GoalStatus } from './goals';
   ```
4. No build step is needed — changes are immediately available.

### Verifying your addition

Temporarily add an `import type` in one backend file and one frontend file, run both builds, then remove the temporary import:

```ts
// Backend (src/some-file.ts)
import type { GoalStatus } from '@ttahub/types';

// Frontend (frontend/src/some-file.ts)
import type { GoalStatus } from '@ttahub/types';
```

Run:
```bash
yarn build          # backend
cd frontend && yarn build  # frontend
```

---

## Usage

```ts
// ✅ Correct — type-only import, stripped at compile time
import type { GoalStatus } from '@ttahub/types';

// ❌ Wrong — do not use a value import; there is no JS runtime artifact
import { GoalStatus } from '@ttahub/types';
```

---

## Developers

Unlike `@ttahub/common`, **no version bump or publish step is ever needed**. Edit files in `src/`, save, done.

If you find yourself adding a runtime value (a constant, function, etc.), place it in `packages/common` instead and follow its publish workflow.
