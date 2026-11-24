# write-jira-tickets: a Claude Desktop skill for TTA Hub tickets

This skill helps a product manager, designer or content person turn an idea into paste-ready Jira tickets for the TTA Hub. Claude interviews you, flags every unanswered question as **[NEEDS DECISION]** instead of guessing, and writes the tickets in Jira's own formatting. It can also produce an engineer handoff form.

It is a non-technical counterpart to the engineering skill in `../spec-handoff/`.

## Install (one time)

1. Build `write-jira-tickets.zip` with `bin/package-desktop-skill` or get it from an engineer
2. In Claude Desktop, open **Settings → Customize → Skills → Yours → Upload**:
3. To update, delete the old version and upload the new zip.

## Use

Start a new chat and say something like:

> Help me write Jira tickets for letting specialists export their goals to CSV. Here are my notes: …

or

> Here's TTAHUB-1234 and its comments. Can you tighten the acceptance criteria and split it into stories?

Paste anything you have: notes, the ticket text, Figma links, screenshots. Work through the questions. "I don't know" is a ok, it will yeild on open question for refinement.

When you approve the draft, Claude gives you each ticket's **Summary** and a **Description** block. In Jira (jira.acf.gov):
1. Open the ticket's Description and switch the editor to **Text** mode.
2. Paste the Description block.
3. Switch back to **Visual** to check how it looks.

If you asked for the **engineer handoff form**, send it to the engineering team. They save it as `specs/<slug>/handoff.md` and use it to write the technical spec.

## For maintainers

- Source: this folder. `SKILL.md` is the workflow, and `references/` holds the material loaded on demand.
- `references/handoff-template.md` is **not** stored here. `bin/package-desktop-skill` copies it from `templates/spec-handoff-template.md` at build time, so the two can't drift apart.
- Build: `bin/package-desktop-skill` writes `dist/write-jira-tickets.zip`.
- Keep `references/product-primer.md` current when navigation, roles or permissions change.
