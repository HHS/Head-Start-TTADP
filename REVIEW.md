⏺ PR Review: #3364 — [Food for thought] Revise AGENTS.md & best_practices.md given possible best practices

  Author: thewatermethod | Branch: revise-agents-for-clarity → main | +99 / -199 across 2 files

  ---
  Summary

  This PR consolidates and restructures AGENTS.md and best_practices.md using Claude-generated suggestions from a team
  discussion. The net effect is a ~100-line reduction — removing verbose architecture documentation from AGENTS.md and
  tightening best_practices.md into a more scannable, constraint-focused format.

  ---
  What works well

  1. AGENTS.md is sharper. The "Traps to Avoid" section is excellent — concrete warnings about enum arrays, Sequelize
  hooks, WYSIWYG autosave, and SQL injection filters are exactly the kind of high-signal guidance agents need. These
  were previously buried or spread across both files.
  2. Less duplication. Previously, rules like "no enum arrays" and "sanitize filter inputs" appeared in
  best_practices.md and had to be inferred from AGENTS.md. Now they live clearly in both places with consistent
  wording.
  3. Command reference is tighter. The new ## Commands section in AGENTS.md is a clean, copy-pasteable reference — much
   better than "see docs/guides/dev-setup.md".
  4. Good net deletion. Going from 199 deletions to 99 additions means real trimming happened, not just reshuffling.

  ---
  Concerns

  1. Significant information loss in AGENTS.md

  The original had detailed architecture documentation that's been removed entirely:

  - Directory-level breakdown of backend (routes/, services/, models/, middleware/, policies/, scopes/, etc.) and
  frontend (pages/, components/, fetchers/, hooks/). An agent encountering this codebase for the first time loses a
  valuable map.
  - Key patterns like "Routes call services, services call models, policies enforce access control" — this is the kind
  of structural knowledge that prevents agents from putting business logic in route handlers.
  - Worker queue details (Scan, Resource, S3, Notification, Maintenance queues) — reduced to a one-liner.
  - Auth architecture (OAuth2/HSES, express-session + Redis) — completely removed.
  - Environment variables section — removed.
  - Common workflows ("Adding a New API Endpoint", "Creating a New Migration") — removed. These were step-by-step
  guides that directly reduce errors.
  - Documentation links (guides, ADRs, OpenAPI, bin/README, CI scripts) — removed.

  The new version says "Express API, React SPA, Bull/Redis worker" and expects the agent to figure out the rest. For a
  codebase of this size, that's a lot of implicit knowledge.

  Suggestion: Consider keeping a condensed "Architecture at a Glance" section — even 15-20 lines covering the layered
  pattern (routes → services → models), key directories, and auth would preserve the most important navigational
  context.

  2. best_practices.md lost some useful content

  - "Add or update tests for behavior changes" — this explicit instruction to write tests is gone. The testing section
  now only describes how to test, not when to test.
  - "If tests are skipped, note why and suggest follow-up coverage" — removed. This was a good review checkpoint.
  - "Prefer following existing style in the surrounding code" — removed from best_practices, only implied now.
  - "Reuse existing components" and hook-based architecture guidance — the React architectural philosophy is gone,
  replaced only with "use useFetch" and "use @trussworks/react-uswds".

  3. Duplication between the two files increased

  The Sequelize enum arrays warning, hooks warning, SQL injection warning, migration conventions, CSS rules, WYSIWYG
  guidance, and release hygiene now appear in both AGENTS.md and best_practices.md with near-identical wording. This
  creates a maintenance burden — when a rule changes, both files need updating.

  Suggestion: Pick one file as the source of truth for each rule. AGENTS.md could reference best_practices.md for
  coding standards (as it already does for testing via docs/guides/testing.md) rather than duplicating them.

  4. The PR description says "Claude produced this"

  The description states: "These edits are what it produced." While using AI to draft improvements is fine, the team
  should critically evaluate whether the restructuring serves human developers and agents equally well, not just accept
   it as-is. The removed architecture documentation was clearly written by someone with deep project knowledge.

  ---
  Minor nits

  - AGENTS.md line 15: "Prefer creating new backend files as TypeScript" is a code authoring rule that lives more
  naturally in best_practices.md (where it was originally). Having it in "Working Rules" alongside process guidance
  ("ask before starting work") is a category mismatch.
  - best_practices.md: The "Backend" heading has only "Sequelize" and "Migrations" under it. "Error Handling & Logging"
   sits at the same indent level but isn't really a Sequelize concern — consider promoting it or giving Backend a brief
   intro.

  ---
  Verdict

  The direction is good — the original AGENTS.md was too long and mixed navigational docs with actionable rules. But
  this PR cuts too deep. The "Traps to Avoid" and "Commands" sections are clear wins; the removal of architecture
  documentation and workflow guides is a net loss that will increase agent hallucination and require more exploratory
  tool calls.

  Recommendation: Merge the structural improvements (traps, commands, tighter formatting) but restore a condensed
  architecture section and deduplicate rules between the two files.