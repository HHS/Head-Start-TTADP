# Repo map: where to check how the Hub works today

The TTA Hub's code is public: https://github.com/HHS/Head-Start-TTADP

Fetch **raw** files with this base URL. Spaces in a path become `%20`.

`https://raw.githubusercontent.com/HHS/Head-Start-TTADP/main/<path>`

If the repo is on the local disk (for example, you are running in Claude Code), read `<path>` directly instead.

Fetch one file at a time, only when the primer doesn't answer the question. Tell the user what you checked.

| Question | Path |
|---|---|
| Shared constants: report statuses, user roles, permission scopes, close/suspend reasons | `packages/common/src/constants.js` |
| Who can edit, delete or approve Training Report sessions | `docs/training-reports/session-permissions.md` |
| Which users can be picked on a Training Report | `docs/training-reports/user-selection-criteria.md` |
| Which emails the Hub sends, and instant vs. digest | `docs/email_notifications.md` |
| Monitoring data on the Regional Dashboard | `docs/regional-dashboard/monitoring.md` |
| Every page and its URL | `frontend/src/Routes.js` |
| How the team plans, reviews and ships work | `docs/guides/engineering-process.md` |
| Past architecture decisions | `docs/adr/` (list it at `https://github.com/HHS/Head-Start-TTADP/tree/main/docs/adr`) |
| Example of a finished feature spec, including a ticket breakdown | `specs/actionable-notifications/index.md` |
| Example of a filled engineer handoff form | `specs/new-homepage-actionable-notifications/handoff.md` |
| Glossary used by engineers | `AGENTS.md`, `best_practices.md` |

## Reading tips

- Constants files are code, but the lists in them (statuses, roles, reasons) are plain enough to read. Quote values exactly.
- If two sources disagree, say so and mark it `[NEEDS DECISION]` (owner: Engineering), rather than picking one.
- Code describes what the Hub does today, not what it should do. Don't treat current behavior as a requirement unless the user confirms it.
