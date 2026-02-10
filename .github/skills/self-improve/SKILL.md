---
name: self-improve
description: Introspect on a completed work session to propose and apply improvements to documentation, agent guidance, and repo quality
outputs:
  - name: improvements
    description: List of proposed changes with rationale, and which were applied
---

## Purpose

Guide end-of-session reflection that turns work context into concrete improvements to documentation and agent guidance. Instead of maintaining a running session log, this skill reconstructs what happened from git state and conversation context, then proposes targeted edits.

## Preconditions

- At least one commit exists on the current branch beyond main (or there are uncommitted changes)
- The agent has context from the current conversation about work performed

## Steps

### 1. Gather session context

Reconstruct what happened during the session using git state:

```bash
# What files changed
git diff main...HEAD --stat

# Commit history for this branch
git log main..HEAD --oneline

# Uncommitted changes
git diff --stat
git diff --cached --stat
```

Read the changed files to understand the nature of the work.

**Build a mental model of:**

| Element | Source |
|---------|--------|
| What code was added/changed | `git diff` |
| Why it was changed | Commit messages + conversation context |
| What patterns were used | Reading the changed files |
| What friction was encountered | Conversation context (errors, retries, pivots) |

### 2. Audit documentation freshness

For each file changed, check whether corresponding documentation is stale:

| If this changed... | Check these docs... |
|--------------------|---------------------|
| Routes or services (`src/routes/`, `src/services/`) | `docs/openapi/` for API spec accuracy, `AGENTS.md` architecture section |
| Models or migrations (`src/models/`, `src/migrations/`) | `docs/tech-stack.md`, `AGENTS.md` database section |
| Test patterns or helpers | `docs/guides/testing.md`, `best_practices.md` testing section |
| Infrastructure or config (Dockerfile, CI) | `docs/guides/infrastructure.md`, `docs/guides/dev-setup.md` |
| Frontend components or pages | `AGENTS.md` frontend section |
| Worker or queue changes | `AGENTS.md` worker section |
| New dependencies (package.json) | `docs/tech-stack.md` |
| Dev workflow (scripts, Makefile, docker-compose) | `docs/guides/yarn-commands.md`, `docs/guides/dev-setup.md` |

Read the relevant doc files and compare their descriptions against the current code state.

### 3. Check for common doc debt signals

Scan documentation files for known debt patterns

**Stale references:**

- File paths mentioned in docs that no longer exist
- Command examples that reference renamed scripts
- Architecture descriptions that don't match current directory structure

**Duplicated content:**

- Check for substantially similar paragraphs across `AGENTS.md`, `README.md`, and doc files
- Identify content that should live in one place and be referenced from others

**Unresolved markers:**

```bash
grep -rn 'TODO\|TBD\|FIXME\|HACK\|XXX' docs/ AGENTS.md best_practices.md
```

Check if any of these can now be resolved given the session's work.

### 4. Review agent guidance gaps

Reflect on the session's conversation context for friction signals:

| Friction signal | Potential improvement |
|-----------------|----------------------|
| Agent had to search extensively for a pattern | Add the pattern to `AGENTS.md` or `best_practices.md` |
| Agent made incorrect assumptions about architecture | Clarify the relevant `AGENTS.md` section |
| Agent used a workaround for a known issue | Document the gotcha in the relevant guide |
| A new convention was established during the session | Capture it in `best_practices.md` |
| Agent needed information that wasn't in any doc | Add it to the appropriate file |
| Agent had to ask for clarification about project norms | Document the answer for future sessions |
| Testing required unexpected setup or teardown | Add to `docs/guides/testing.md` |

### 5. Propose improvements

Present a numbered list of proposed changes. Each proposal should include:

```markdown
### Proposal N: [Brief title]

- **Target file:** `path/to/file.md`
- **Category:** [docs-freshness | broken-link | duplicate-content | new-pattern | agent-guidance | stale-reference]
- **What:** [Specific change to make]
- **Why:** [Rationale tied to session context or audit finding]
```

Categories explained:

| Category | Meaning |
|----------|---------|
| `docs-freshness` | Documentation doesn't match current code state |
| `broken-link` | A relative link points to a file that doesn't exist |
| `duplicate-content` | Same information repeated across multiple files |
| `new-pattern` | A pattern or convention established during the session worth capturing |
| `agent-guidance` | Missing or misleading guidance in agent-facing files |
| `stale-reference` | Doc references a file, command, or concept that no longer exists |

If no improvements are found, state "No improvements identified" with a brief explanation of what was checked.

### 6. Apply approved changes

Ask the user which proposals to apply:

- "Apply all" — edit all target files
- Selective — apply only chosen proposals
- "None" — skip application, keep proposals as a record

For each approved proposal, edit the target file directly. Keep changes minimal and focused — don't rewrite entire sections when a sentence fix suffices.

### 7. Summary

Output a final summary:

```markdown
## Session Reflection Summary

### Applied
- [List of proposals that were applied, with file paths]

### Deferred
- [List of proposals not applied, with brief reason]

### Session stats
- Files changed this session: N
- Docs checked: N
- Proposals generated: N
- Proposals applied: N
```

## Completion Criteria

- [ ] Git diff and log were reviewed for the session's changes
- [ ] Documentation files were checked for staleness against code changes
- [ ] Broken links, duplicates, and stale references were scanned for
- [ ] Agent guidance was reviewed for gaps based on session friction
- [ ] At least one proposal was generated (or an explicit "nothing to improve" finding)
- [ ] Approved proposals were applied to the target files
