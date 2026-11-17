---
name: write-jira-tickets
description: Helps a product manager or designer turn an idea, notes, a Figma link or an existing ticket for the TTA Hub (Office of Head Start TTA Smart Hub) into paste-ready Jira tickets - an epic and/or stories with Given/When/Then acceptance criteria - and optionally an engineer handoff form. Interviews the user, flags every unanswered question as [NEEDS DECISION] instead of guessing, and outputs Jira wiki markup. Use when asked to write, draft, split or improve a Jira ticket, user story, epic or acceptance criteria for the TTA Hub.
---

# Write Jira tickets for the TTA Hub

## Who this is for

A product manager, designer or content person who wants to write tickets for the TTA Hub. Assume they are **not** an engineer. Use plain language. Don't mention code, databases or file names unless the user asks for them.

## What this skill is for

Its purpose is to produce tickets that engineers can build without guessing. Figma doesn't show interaction states, exact copy, accessibility needs or edge cases, and Jira acceptance criteria are usually incomplete. This skill surfaces those gaps clearly instead of filling them with plausible guesses.

**Eight open questions make a good ticket. Eight invented answers are the failure this skill exists to prevent.**

## Outputs

1. **Jira tickets, always.** A Summary and a Description for each ticket, written in **Jira wiki markup** (not Markdown) so they can be pasted into `jira.acf.gov`. That Jira is self-hosted and Claude cannot reach it, so the user pastes the tickets in themselves.
2. **Engineer handoff form, optional.** A filled version of `references/handoff-template.md`. Engineering saves it as `specs/<slug>/handoff.md` in the repo and runs their `spec-handoff` skill on it.

## Reference files

| File | Read it when |
|---|---|
| `references/product-primer.md` | Always, before the interview. It covers vocabulary, user roles, permissions and the main areas of the Hub. |
| `references/ticket-format.md` | Before drafting tickets. It contains the exact wiki-markup templates. |
| `references/repo-map.md` | Only when you need to check how the Hub works today and the primer doesn't say. |
| `references/handoff-template.md` | Only if the user wants the engineer handoff form. |

---

## Step 1: Intake

Ask what they want built, and invite them to paste anything they already have: notes, an existing ticket, Slack threads, Figma links, screenshots, research findings.

Then ask which outputs they want:
- Jira tickets only (the default)
- Jira tickets plus an engineer handoff form

If they give an existing Jira key (for example `TTAHUB-1234`), keep it. Ask them to paste the ticket's text and comments, because you can't open Jira. Acceptance criteria and reversals often live in the comments.

## Step 2: Interview

Ask **2–3 questions per turn**, never a wall of questions. Skip anything already answered in what they pasted. Cover:

**Why and who**
- Who is this for? Name the role, such as Program Specialist, Grantee Specialist, TTAC or Regional Program Manager. See the primer.
- What problem does it solve, and why now?

**Scope**
- What's the smallest version that would be useful?
- What is explicitly **out of scope**? If they can't name anything, scope is probably still unclear. Say so gently and ask again.
- Must anything stay unchanged?
- Does this depend on, or block, other work?

**What Figma and Jira usually don't say.** Phrase these questions plainly:
- What does the screen show when there's no data yet? (empty state)
- What can go wrong, and what exactly does the person see? (errors, exact wording)
- What does the person see while it's loading or saving?
- Which fields are required? What are the limits (length, format), and what does each error message say?
- Are hover, focus and disabled looks drawn in Figma? Where?
- What happens when text is very long? (truncation, wrapping)
- Who can **see** this, and who can **do** each action? Use the roles and permissions in the primer.
- For screen-reader users: does anything appear or change without a page load that should be announced?
- Does anything need to work differently on a phone or a narrow screen?
- Should it go out behind a feature flag to a small group first?

**Design.** If there's Figma, ask which frames matter. If a Figma connector is available, look at **one frame at a time**. Otherwise work from screenshots, and say in the ticket that you did.

The user is allowed to say "I don't know." Treat that as an answer, not as an invitation for you to fill the gap.

## Step 3: Check the product, when needed

- Start with `references/product-primer.md`.
- If you need to confirm current behavior, a dropdown value, an email notification or a permission rule, fetch the specific file listed in `references/repo-map.md`. Fetch one file at a time, only what you need.
- If the repository is available on the local disk, as in Claude Code, read the file there instead of fetching it.
- When you state how the Hub works today, say where that came from ("per the Training Report permissions doc…"). If you couldn't confirm it, say so.
- If web fetching is unavailable, continue with the primer alone and tell the user that current behavior wasn't verified.

Never propose database, API or code designs. That is engineering's job at refinement.

## Step 4: Mark the gaps

Anything the user couldn't answer becomes `[NEEDS DECISION]`, with a suggested owner:

| Kind of gap | Suggested owner |
|---|---|
| Visual states, layout, responsive behavior | Design |
| Exact copy, error messages, empty-state text, email wording | Content / Design |
| Who can see or do what; policy; regional rules | Product / OHS |
| Feasibility, performance, data availability | Engineering |
| Accessibility behavior | Design + Engineering |

Rules:
- **Never invent** copy, error messages, empty states or permission rules. You may *suggest* an option, but label it "Suggestion, not decided" and still mark it `[NEEDS DECISION]`.
- **Keep the user's own words** for requirements they gave you. Don't paraphrase them into something more confident. Your interpretation goes in a separate, labeled note.

## Step 5: Draft and review in chat

Read `references/ticket-format.md`, then draft:

- **One story** if the work is small enough to finish in a single sprint.
- **An epic plus stories** otherwise. Each story should be something one engineer can finish and a tester can verify on its own. Common split lines include backend before frontend, one screen per story, a read-only view before editing, and a separate story for email notifications.

Each story includes a user story sentence, background, acceptance criteria in Given/When/Then form (happy path, edge case, error and permission denied, at minimum), out of scope, design links, open questions, and "Story points: for refinement". Don't estimate points; the team does that.

Show the draft as readable text first, **not** wiki markup. Ask the user what's wrong or missing. Revise until they say it's right.

## Step 6: Deliver

Once the user approves:

1. For each ticket: **Issue type**, **Summary** (plain text, under 100 characters), and the **Description** in one fenced code block of Jira wiki markup, so it can be copied in a single click. If you can create files, also offer all the tickets as one downloadable `.txt` file.
2. Tell them how to paste it. In Jira, switch the Description editor to **Text** mode, paste, and switch back to **Visual** to check how it looks.
3. If they asked for the handoff form, fill `references/handoff-template.md` with everything gathered. Leave unanswered fields blank, because the engineer skill flags blanks itself. Deliver it as a Markdown code block or a downloadable `handoff.md`. Suggest a kebab-case slug, for example `recipient-export-csv`. Tell them to send it to engineering, to be saved as `specs/<slug>/handoff.md`.

## Step 7: Stop and summarize

End with:
1. A one-line summary of what was drafted, for example "1 epic, 4 stories".
2. Every `[NEEDS DECISION]`, numbered, with its owner. Put blocking items first.
3. Anything you couldn't see or verify, such as a Figma frame you couldn't open or behavior you couldn't confirm.

---

## Don'ts

| Don't | Why |
|---|---|
| Fill a gap with a plausible answer | The gaps are the information. Hiding them causes rework later. |
| Paraphrase the user's requirements | Loses the wording the team agreed to. |
| Invent copy, error messages or empty states | Content is a design and policy decision. |
| Ask ten questions at once | Overwhelms people; answers get shallow. |
| Write technical design or code | Engineering decides that at refinement. |
| Output Markdown for Jira | jira.acf.gov uses wiki markup; Markdown pastes as clutter. |
| Estimate story points | The team estimates together. |
| Look at a whole Figma page at once | Too much at once; read one frame at a time. |
