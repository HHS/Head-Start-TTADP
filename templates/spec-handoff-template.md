<!--
SPEC HANDOFF FORM — blank template.

Copy to specs/<feature-slug>/handoff.md, fill it in, then handoff to an agent:
  "Use the spec-handoff skill with specs/<feature-slug>/handoff.md"
-->

# Spec handoff: <feature name>

**Slug:** <kebab-case-name>
**Filled by:** <name> · **Date:** <YYYY-MM-DD>

---

## 1. Definition of work

| | |
|---|---|
| Jira issue or epic | <URL and key> |
| Is this an epic with child tickets? | yes / no |
| Acceptance criteria live in | ticket description / a custom field / comments / not written yet |
| Figma file | <URL> |
| Figma frames that matter | <frame name — node-id>, one per line |
| Other sources | Other links accessible to a local agent |

Paste the ticket body and its acceptance criteria here:

```
<paste, or delete this block>
```

---

## 2. Why

**Who is this for?** Roles or personas, and their permission level.

<...>

**Why now?** The problem, or the ticket's rationale.

<...>

---

## 3. Boundaries

**Explicitly out of scope** 

- <...>
- <...>

**Must not change:**

<...>

**Depends on / blocked by:**

<...>

---

## 4. The things Figma and Jira don't say

Answer what you know; leave the rest blank so the agent flags it.

| Question | Answer |
|---|---|
| Empty state — what shows when there's no data? | |
| Error states — what can fail, and what does the user see? | |
| Loading state | |
| Validation rules and exact error copy | |
| Hover / focus / disabled states — are they drawn in Figma? where? | |
| Character limits, truncation, overflow | |
| Reading order and focus management concerns | |
| Screen-reader announcements needed (live regions, status) | |
| Who can see this? who can act on it? | |
| What happens on a slow or failed request? | |
| Anything mobile-specific or responsive-breakpoint-specific | |

---

## 5. Technical constraints

Things you'd tell a new teammate before they started.

- Data model: <new tables? new columns? existing models to reuse?>
- API shape: <new endpoints? changes to existing?>
- Feature flag: <name, or "none">
- Reuse this, don't rebuild it: <existing components, hooks, services, constants>
- Known traps for this area: <...>
- Performance or volume concerns: <...>
