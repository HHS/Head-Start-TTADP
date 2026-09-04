---
name: spec-handoff
description: Turn a filled handoff form and a Figma design into an approved markdown spec at specs/<slug>/index.md, then implement it to codebase convention. Use when starting a ticket that has a design attached, or when asked to write a spec, plan a feature, or translate a Figma deliverable into text.
license: MIT
compatibility: Requires git. Optional: a Figma MCP server, a local Jira export.
---


## Purpose

Produce a spec a human has approved, then build from it. The spec is the deliverable at gate 2; code comes after.

This skill exists because Figma cannot express interaction states, content rules, accessibility intent or edge cases, and because Jira acceptance criteria are usually incomplete. Its job is to surface those gaps loudly rather than fill them with plausible guesses.

## Inputs

| Input | Required | Notes |
|---|---|---|
| Filled handoff form | yes | `templates/spec-handoff-template.md`, filled and saved to `specs/<slug>/handoff.md` |
| Jira issue or epic key | yes | e.g. `TTAHUB-5383` |
| Figma frame URLs | if the work has a design | must include `node-id` |
| Feature slug | yes | kebab-case, e.g. `actionable-notifications` |

## Outputs

| Output | Path |
|---|---|
| Spec | `specs/<slug>/index.md` |
| Open questions list | printed at gate 2, before any code |
| Implementation | branch + atomic commits + PR |
| Recorded learnings | via the `self-improve` skill; ADR if a decision was made |

## Preconditions

- A handoff form exists and its Jira key and acceptance criteria fields are filled.
- You are on a feature branch, not `main`.
- You have read this repo's `AGENTS.md` and `best_practices.md`.

Stop and ask if any of these are false. Do not fill in a missing form yourself.

---

## Gate 1 — Read the form

Read `specs/<slug>/handoff.md`.

Check it is usable:

- Jira key present.
- Acceptance criteria present
- If a Figma link is given, it has a `node-id` and names which frames matter.
- Out-of-scope section is not empty. An empty out-of-scope section almost always means scope is still unclear.

If anything is missing, list what is missing and stop. Do not proceed on assumptions.

## Gate 2, step 1 — Read our conventions before you read the design

```bash
# Always
cat AGENTS.md
cat best_practices.md 2>/dev/null

# The nearest existing spec — copy its shape, do not invent a new one
ls specs/
cat specs/*/index.md | head -80

# Decisions that may already constrain this work
ls docs/adr/
```

Search for prior art on this specific feature:

```bash
# Has any of this been built or half-built already?
grep -rIn "<feature-keyword>" src/ frontend/src/ packages/ --include="*.js" --include="*.ts" --include="*.tsx" | head -30

# Relevant constants, types, services
grep -rn "<domain-noun>" src/constants.js packages/common/src/ 2>/dev/null | head -20
```

Write down constraints that will shape this feature. If you cannot name any, you have not read enough.

## Gate 2, step 2 — Pull the ticket

Use whichever path this repo has configured. Try in this order and stop at the first that works.

1. **Local export**, if `specs/<slug>/jira/` exists — read the files. No network needed.
2. **Ask the human to paste it.** This is a normal outcome, not a failure. Self-hosted Jira behind SSO often cannot be reached from an agent sandbox.

Whichever path:

- Copy requirements **verbatim** into the spec's "Requirements (from Jira)" section. Do not paraphrase a requirement.
- Read the comments, not just the description. Acceptance criteria and reversals frequently live there.
- If acceptance criteria appear to be in a custom field, do not guess its ID — ask, or read the export.
- Note the story points and ticket breakdown if the epic already has them.

## Gate 2, step 3 — Pull the design

Only if a Figma link was given. **One frame at a time.** Pointing a code tool at a whole page floods the context window and quality drops.

Per frame, in this order:

1. `get_metadata` — cheap structure pass. Confirm you are looking at the frame the form named.
2. `get_screenshot` — visual grounding.
3. `get_variable_defs` — tokens. Prefer these over any hardcoded value you see.
4. `get_code_connect_map` — if it returns real component names, use them. Otherwise expect generic output and map to our components yourself.
5. `get_design_context` — last, and only for the frame in hand.

If no Figma MCP server is available, work from screenshots the developer attached plus the form's description. Say so in the spec.

Record in the spec:

- Frame name and `node-id` for every screen described.
- The date you read the design, and the Figma version if available. Designs change and nothing notifies you.
- Tokens used, by name.
- Our component names — `@trussworks/react-uswds` components and USWDS utility classes, not new CSS.

**Do not infer any of the following from a design. Ask.**

| Not in Figma | What to do |
|---|---|
| Hover, focus, disabled, loading states | check for a variant or a separate frame; if absent, `[NEEDS DECISION]` |
| Empty states | `[NEEDS DECISION]` |
| Error and validation messages, exact copy | `[NEEDS DECISION]` |
| Reading order, ARIA roles, alt text, focus management | `[NEEDS DECISION]` |
| Character limits, truncation rules | `[NEEDS DECISION]` |
| What happens on slow or failed network | `[NEEDS DECISION]` |
| Permissions — who can see or do this | check `src/policies/`, then `[NEEDS DECISION]` |

## Gate 2, step 4 — Write the spec

Write `specs/<slug>/index.md` using `templates/spec-template.md`.

Rules:

- **Stable IDs.** `REQ-1`, `SEC-1`, `A11Y-1`, `CON-1` (constraint). Tests, commits and PR comments cite these.
- **Verbatim requirements.** Quote Jira; add your interpretation separately and label it as yours.
- **Given/When/Then acceptance criteria**, one per requirement minimum. Cover happy path, edge case, error, permission.
- **Every gap marked `[NEEDS DECISION]`** with who should answer it. Eight open questions is a good spec. Eight invented answers is the failure this skill exists to prevent.
- **Cite our constraints by name.** "New backend files in TypeScript per `best_practices.md`." "No Sequelize hooks that write data." Do not restate them generically.
- **Propose a ticket breakdown** if the input was an epic — follow the pattern in `specs/actionable-notifications/index.md`, with points.
- Keep it readable by a designer and a PM, not only an engineer. Plain language.

## Gate 2, step 5 — Stop

Print:

1. A two-line summary of what the spec says.
2. Every `[NEEDS DECISION]`, numbered, with who should answer it.
3. Anything in the design you could not read.
4. Anything in the spec you are less than confident about, and why.

Then **stop and wait for a human**. Do not write implementation code. Do not "start on the easy part."

---

## Gate 3 — Implement

Only after a human has approved the spec.

- Follow `AGENTS.md` and `best_practices.md`
- Reference the requirement IDs in commit bodies so the chain holds: Jira key → spec ID → commit → PR.
- Do not redesign architecture or add tools or services without explicit approval.
- If you discover the spec was wrong, **update the spec and say so**. 
- Run lint and tests before opening a PR. Fill the repo's PR template, including the Jira link.

## Gate 4 — Record

- **If any frame in this spec used a component with no Code Connect mapping, write the mapping now.** Template file, `.figma.js`, colocated for our components or in a component-specific location for `@trussworks/react-uswds`. This is how coverage grows — one ticket at a time, prioritized by what the team actually touches, never as its own project.
- Run the `self-improve` skill. It reconstructs the session from git and proposes doc updates.
- If an architectural decision was made, write an ADR using the repo's ADR template and directory.
- Update the spec's status line: draft → approved → implemented.
- If the spec's own template or this skill caused friction, say so. That feedback is the point of the pilot.

---

## Completion criteria

- [ ] Handoff form was read and validated; missing fields were raised, not filled in
- [ ] `AGENTS.md`, `best_practices.md` and the nearest existing spec were read before the design
- [ ] Jira requirements copied verbatim with a source link
- [ ] Each design frame recorded with `node-id` and read date; tokens named
- [ ] Every gap marked `[NEEDS DECISION]` with an owner
- [ ] Spec written to `specs/<slug>/index.md` with stable requirement IDs
- [ ] Execution stopped for human approval before any implementation
- [ ] Implementation cites requirement IDs; lint and tests pass
- [ ] `self-improve` run; ADR written if a decision was made

## Anti-patterns

| Don't | Why |
|---|---|
| Fill a blank form field yourself | The gaps are the information. Filling them hides the problem this skill exists to expose. |
| Run `get_design_context` on a whole page | Floods context, output degrades. |
| Paraphrase a Jira requirement | Loses the contractual wording the team agreed to. |
| Invent an error message or empty state | Content is a design and policy decision, not an implementation detail. |
| Write code before approval | Gate 2 is the deliverable. |
| Restate generic best practice | Cite this repo's actual named constraints instead. |
| Diverge from the spec silently | Update the spec, then diverge. |
