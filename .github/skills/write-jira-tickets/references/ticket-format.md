# Ticket format (Jira wiki markup)

`jira.acf.gov` is self-hosted Jira. Its Description field uses **wiki markup**, not Markdown.

## Cheat sheet

| Want | Wiki markup | Not this (Markdown) |
|---|---|---|
| Heading | `h3. Acceptance criteria` | `### Acceptance criteria` |
| Bold | `*bold*` | `**bold**` |
| Italic | `_italic_` | `*italic*` |
| Bullet | `* item` / `** nested` | `- item` |
| Numbered | `# item` | `1. item` |
| Link | `[Figma frame|https://...]` | `[Figma frame](https://...)` |
| Table header | `\|\|Question\|\|Owner\|\|` | `\| Question \| Owner \|` + `\|---\|` |
| Table row | `\|Empty state copy\|Content\|` | |
| Inline code | `{{monospace}}` | `` `code` `` |
| Callout | `{panel:title=Open questions}...{panel}` | |
| Literal brackets | `\[NEEDS DECISION\]` | `[NEEDS DECISION]` (renders as a broken link) |

Square brackets mean "link" in wiki markup, so **always escape them**: write `\[NEEDS DECISION\]`.

## Epic template

```
h3. Summary
<One paragraph: what this is and who it helps, in plain language.>

h3. Why
<The problem, and why now.>

h3. Who it's for
* <Role> — <what they need>

h3. Scope
* <In scope item>

h3. Out of scope
* <Item>

h3. Stories
# <Story 1 summary>
# <Story 2 summary>

h3. Design
* [<Frame name>|<Figma URL with node-id>]

{panel:title=Open questions}
||#||Question||Owner||Blocking?||
|1|\[NEEDS DECISION\] <question>|<owner>|yes|
{panel}
```

## Story template

```
h3. User story
*As a* <role>, *I want* <goal>, *so that* <benefit>.

h3. Background
<Context, links to research or related tickets. Requester's own wording where possible.>

h3. Requirements
* <Requirement, in the requester's words>

_Interpretation (drafting note, not the requester's words):_ <only if needed>

h3. Acceptance criteria

*Scenario: <happy path name>*
* *Given* <precondition>
* *When* <action>
* *Then* <expected result>

*Scenario: <edge case — e.g. no data yet>*
* *Given* ...
* *When* ...
* *Then* ...

*Scenario: <error — e.g. save fails>*
* *Given* ...
* *When* ...
* *Then* ...

*Scenario: <permission denied — e.g. user without approve permission>*
* *Given* ...
* *When* ...
* *Then* ...

h3. Accessibility
* <keyboard, focus, screen-reader announcements — or \[NEEDS DECISION\]>

h3. Out of scope
* <item>

h3. Design
* [<Frame name>|<Figma URL with node-id>]
* States drawn in Figma: <list> / not drawn: <list>

{panel:title=Open questions}
||#||Question||Owner||Blocking?||
|1|\[NEEDS DECISION\] <question>|<owner>|yes/no|
{panel}

Story points: _for refinement_
```

## Writing good acceptance criteria

- One observable outcome per *Then*. "Then the report is saved *and* an email is sent" is two Thens.
- Use real role names from the primer, not "the user".
- Use exact copy in quotes when it's decided. When it isn't, write `\[NEEDS DECISION\] copy for <thing>`.
- Cover at least: happy path, an edge case, an error, permission denied.
