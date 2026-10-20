---
name: write-user-story
description: Create a well-structured user story with acceptance criteria, following project conventions and issue templates
inputs:
  - name: feature_description
    description: Brief description of what the user wants to accomplish
    required: true
  - name: user_role
    description: The type of user (e.g., "admin", "developer", "end user")
    required: false
outputs:
  - name: user_story
    description: Complete user story with title, description, and acceptance criteria
---

## Purpose

Guide the creation of consistent, actionable user stories that follow project conventions and leverage existing issue templates when available.

## Preconditions

- Feature or capability has been discussed or requested
- User role and goal are understood at a high level

## Steps

### 1. Check for existing issue templates

Search the repository for issue templates in common locations:

**Primary locations to check:**

- `.github/ISSUE_TEMPLATE/` directory (YAML or Markdown templates)
- `.github/ISSUE_TEMPLATE.md` (single template file)
- `docs/ISSUE_TEMPLATE.md` (alternative location)

**What to look for:**

| File Pattern | Purpose |
|--------------|---------|
| `feature_request.yml` or `feature_request.md` | Use as primary structure basis |
| `bug_report.yml` or `bug_report.md` | Note fields for cross-referencing |
| `config.yml` | Check for blank issue restrictions or external links |
| Custom templates (e.g., `user_story.yml`) | Follow established team conventions |

**If templates exist:**

1. Read the template content to understand required fields
2. Note any dropdown options, checkboxes, or validation rules
3. Identify which template best fits a user story (usually feature request)
4. Map your user story components to the template's structure

**If no templates exist:**

- Proceed with the standard format in Step 3
- Consider recommending an issue template as a follow-up improvement

### 2. Gather user story components

Collect the essential elements:

| Component | Question to Answer |
|-----------|-------------------|
| **User Role** | Who is the user? Be specific (not just "user") |
| **Goal** | What does the user want to do? |
| **Benefit** | Why does the user want this? What value does it provide? |
| **Context** | What triggers this need? When would this be used? |

### 3. Draft the user story

Write using the standard format:

```markdown
## User Story

**As a** [specific user role],
**I want** [goal/desire],
**So that** [benefit/value].
```

<!-- CUSTOMIZE: Your team may prefer alternative formats such as:
- Job Story: "When [situation], I want to [motivation], so I can [expected outcome]"
- Feature-driven: "In order to [benefit], as a [role], I want [feature]"
Document your preferred format here. -->

### 4. Define acceptance criteria

Write testable, specific acceptance criteria using Given/When/Then:

```markdown
## Acceptance Criteria

### Scenario: [descriptive name]
- **Given** [precondition/context]
- **When** [action taken]
- **Then** [expected outcome]
```

Include criteria for:

- [ ] Happy path (primary success scenario)
- [ ] Edge cases (boundaries, limits, empty states)
- [ ] Error handling (invalid input, failures)
- [ ] Accessibility requirements (if applicable)
- [ ] Security considerations (authentication, authorization)

<!-- CUSTOMIZE: Add team-specific acceptance criteria categories:
- [ ] Performance requirements
- [ ] Compliance requirements (Section 508, WCAG, etc.)
- [ ] Audit logging requirements
-->

### 5. Add supporting context

Include additional sections as needed:

```markdown
## Technical Notes

- Dependencies: [related systems, APIs, services]
- Constraints: [technical limitations, regulatory requirements]

## Out of Scope

- [Explicitly list what this story does NOT include]

## Related

- Relates to #[issue number]
- Blocked by #[issue number]
- Part of Epic: [epic name/link]
```

<!-- CUSTOMIZE: Add fields your team commonly uses:
- Sprint/iteration
- Story points estimate
- Priority level
- Security classification
-->

### 6. Validate the story

Before finalizing, verify the story meets INVEST criteria:

| Criterion | Check |
|-----------|-------|
| **Independent** | Can be developed without depending on other stories |
| **Negotiable** | Details can be discussed and refined |
| **Valuable** | Delivers value to the user or business |
| **Estimable** | Team can estimate the effort required |
| **Small** | Can be completed in one sprint/iteration |
| **Testable** | Acceptance criteria are verifiable |

### 7. Create the issue

If an issue template was found in step 1:

- Use the template structure
- Map user story components to template fields
- Fill in all required fields

If no template exists:

- Create issue with the drafted user story
- Consider proposing an issue template for future consistency

## Completion Criteria

- [ ] User story follows "As a / I want / So that" format (or team's preferred format)
- [ ] At least 3 acceptance criteria defined with Given/When/Then
- [ ] Story meets INVEST criteria
- [ ] Issue template used if available, or story formatted consistently
- [ ] Related issues/epics linked
- [ ] Out of scope items explicitly listed

## Examples

### Example: Good User Story

```markdown
## User Story

**As a** system administrator,
**I want** to receive email notifications when user accounts are locked,
**So that** I can proactively assist users and identify potential security issues.

## Acceptance Criteria

### Scenario: Account locked due to failed login attempts
- **Given** a user account exists in the system
- **When** the account is locked after 5 failed login attempts
- **Then** an email is sent to all system administrators within 1 minute

### Scenario: Email contains relevant details
- **Given** an account lock notification is triggered
- **When** the email is sent
- **Then** it includes: username, timestamp, IP address of attempts, and unlock link

### Scenario: Administrator is unavailable
- **Given** no administrator acknowledges the notification within 1 hour
- **When** the escalation timer expires
- **Then** the notification is escalated to the security team

## Technical Notes

- Integrates with existing email service (SendGrid)
- Must respect user notification preferences
- Audit log entry required for compliance

## Out of Scope

- Self-service account unlock (separate story)
- SMS notifications (future enhancement)

## Related

- Part of Epic: Account Security Improvements
- Relates to #142 (Audit logging)
```

### Example: Poor User Story (Avoid)

```markdown
## User Story

As a user, I want better notifications so that I know what's happening.

## Acceptance Criteria

- Notifications work
- Users are happy
```

**Why this is poor:** Vague user role, unclear goal, unmeasurable criteria.

## References

- [User Stories Applied by Mike Cohn](https://www.mountaingoatsoftware.com/books/user-stories-applied)
- [INVEST Criteria](https://www.agilealliance.org/glossary/invest/)
- [Given-When-Then Format](https://martinfowler.com/bliki/GivenWhenThen.html)

<!-- CUSTOMIZE: Add your team's specific references:
- Link to your team's user story examples
- Link to your definition of ready
- Link to your agile process documentation
-->
