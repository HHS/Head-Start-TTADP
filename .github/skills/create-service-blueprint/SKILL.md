---
name: create-service-blueprint
description: Create a service blueprint documenting frontstage and backstage processes that deliver a service experience
inputs:
  - name: service_scenario
    description: The specific service interaction or transaction being mapped
    required: true
  - name: scope
    description: The boundaries of the blueprint (start and end points)
    required: false
  - name: journey_map
    description: Reference to existing journey map if available
    required: false
outputs:
  - name: service_blueprint
    description: Complete blueprint with all swim lanes and failure points identified
---

## Purpose

Guide the creation of service blueprints that visualize how a service is delivered, connecting user-facing interactions to the underlying systems, processes, and people that support them.

## Preconditions

- Service or process exists (current state) or is being designed (future state)
- Understanding of the user journey (journey map recommended but not required)
- Access to subject matter experts for backstage processes

## Steps

### 1. Define the blueprint scope

Establish boundaries for what the blueprint will cover:

| Element | Question to Answer |
|---------|-------------------|
| **Service scenario** | What specific interaction are we mapping? |
| **User segment** | Who is the user in this scenario? |
| **Starting point** | Where does this service interaction begin? |
| **Ending point** | Where does it conclude? |
| **Depth** | How far into support systems do we go? |

**Scoping guidance:**

- Start narrower than you think (one scenario, not entire service)
- A journey map phase often becomes one blueprint
- Focus on scenarios with known pain points or redesign priority

<!-- CUSTOMIZE: Define standard blueprint scopes for your agency:
- Application submission to determination
- Account creation to first transaction
- Issue reported to resolution
-->

### 2. Set up the swim lanes

Service blueprints use horizontal lanes to show different layers:

```markdown
┌─────────────────────────────────────────────────────────────────┐
│  PHYSICAL EVIDENCE                                              │
│  (Artifacts the user sees or receives)                          │
├─────────────────────────────────────────────────────────────────┤
│  USER ACTIONS                                                   │
│  (What the user does)                                           │
├─────────────────────────────────────────────────────────────────┤
│  ══════════════════ LINE OF INTERACTION ══════════════════════  │
├─────────────────────────────────────────────────────────────────┤
│  FRONTSTAGE ACTIONS                                             │
│  (Visible employee/system actions)                              │
├─────────────────────────────────────────────────────────────────┤
│  ══════════════════ LINE OF VISIBILITY ═══════════════════════  │
├─────────────────────────────────────────────────────────────────┤
│  BACKSTAGE ACTIONS                                              │
│  (Invisible employee actions)                                   │
├─────────────────────────────────────────────────────────────────┤
│  ══════════════════ LINE OF INTERNAL INTERACTION ═════════════  │
├─────────────────────────────────────────────────────────────────┤
│  SUPPORT PROCESSES                                              │
│  (Systems, partners, infrastructure)                            │
└─────────────────────────────────────────────────────────────────┘
```

**Key dividing lines:**

| Line | Meaning |
|------|---------|
| **Line of Interaction** | Separates user from service provider |
| **Line of Visibility** | Separates what user can see from what they cannot |
| **Line of Internal Interaction** | Separates direct service staff from support functions |

### 3. Map user actions

Transfer or create the user action sequence across the top:

```markdown
## User Actions

| Step | Action | Channel |
|------|--------|---------|
| 1 | Searches for service information | Web |
| 2 | Reviews eligibility requirements | Web |
| 3 | Starts application | Web |
| 4 | Uploads documents | Web |
| 5 | Submits application | Web |
| 6 | Checks status | Web/Phone |
| 7 | Receives determination | Mail/Email |
```

If a journey map exists, user actions should align with it.

### 4. Document physical evidence

For each user action, identify tangible artifacts:

```markdown
## Physical Evidence

| User Action | Evidence |
|-------------|----------|
| Searches for service | Search results, agency homepage |
| Reviews eligibility | Eligibility page, FAQ, downloadable checklist |
| Starts application | Application form, progress indicator |
| Uploads documents | Upload interface, confirmation message |
| Submits application | Confirmation page, confirmation email, reference number |
| Checks status | Status portal, phone IVR message |
| Receives determination | Determination letter, next steps instructions |
```

**Government-specific evidence:**

- Official notices and letters (often legally required format)
- Reference/case numbers
- Downloadable PDFs
- Mailed physical documents
- Cards (EBT, ID, license)

### 5. Map frontstage actions

Document visible service provider actions:

```markdown
## Frontstage Actions (Visible to User)

| User Action | Frontstage Response |
|-------------|---------------------|
| Submits application | System displays confirmation, sends email |
| Calls for status | Call center agent looks up case, provides update |
| Visits field office | Clerk greets, reviews documents, provides receipt |
```

**Frontstage includes:**

- Automated system responses (confirmation emails, status updates)
- Live agent interactions (call center, chat, in-person)
- Self-service portal displays

### 6. Map backstage actions

Document invisible employee and system actions:

```markdown
## Backstage Actions (Invisible to User)

| Trigger | Backstage Action | Role/System |
|---------|------------------|-------------|
| Application submitted | Application enters review queue | Workflow system |
| Application submitted | Automated eligibility pre-check | Rules engine |
| Document uploaded | Document scanned for quality | OCR system |
| Case assigned | Eligibility worker reviews application | Eligibility Worker |
| Verification needed | Worker requests third-party data | Worker + Integration |
| Determination made | Supervisor reviews decision | Supervisor |
| Determination approved | System generates notice | Notice generation |
```

**Government-specific backstage:**

- Eligibility determination logic
- Fraud detection checks
- Supervisor review and approval chains
- Audit trail and logging
- Inter-agency data verification

### 7. Identify support processes

Document underlying systems and external dependencies:

```markdown
## Support Processes

| Backstage Action | Supporting System/Process |
|------------------|---------------------------|
| Automated eligibility check | Eligibility rules engine, policy database |
| Third-party verification | SSA, IRS, state DMV integrations |
| Document storage | Document management system (DMS) |
| Notice generation | Notice template system, print/mail vendor |
| Payment processing | Financial management system, Treasury |
| Authentication | Login.gov, agency identity provider |
```

**Common government support systems:**

- Identity verification (Login.gov, ID.me)
- Payment rails (Treasury, ACH, card networks)
- Data sharing (federal hubs, state exchanges)
- Case management systems
- Content management systems
- Analytics platforms

<!-- CUSTOMIZE: Document your agency's specific systems:
- Core case management platform
- Integration middleware
- External partner systems
-->

### 8. Identify failure points and wait times

Mark where things break down or slow down:

```markdown
## Failure Points

| Location | Failure Point | Impact | Frequency |
|----------|---------------|--------|-----------|
| Document upload | File rejected (wrong format) | User must retry | High |
| Eligibility check | Third-party service timeout | Application stuck | Medium |
| Determination | Missing information discovered late | Delay + user contact | Medium |
| Notice delivery | Mail returned undeliverable | User unaware of decision | Low |

## Wait Times

| Between | And | Typical Wait | User Visibility |
|---------|-----|--------------|-----------------|
| Submission | Assignment | 2 days | None (no notification) |
| Assignment | Initial review | 5 days | None |
| Info request sent | User response | 7 days | User sees request |
| Review complete | Notice mailed | 3 days | None |
```

Use symbols in your blueprint:

- ⚠️ Failure point
- ⏱️ Wait time / delay
- 🔄 Handoff between systems/teams

### 9. Surface insights and opportunities

Analyze the blueprint for improvement areas:

```markdown
## Insights

### Bottlenecks
- [Where does work pile up?]

### Redundancies
- [Where is effort duplicated?]

### Gaps
- [Where is information lost between handoffs?]

### User pain points caused by backstage issues
- [Connect backstage problems to frontstage experience]

## Opportunities

| Opportunity | Addresses | Effort | Impact |
|-------------|-----------|--------|--------|
| Proactive status notifications | Wait time invisibility | Medium | High |
| Pre-submission document validation | Upload failures | Low | Medium |
| Parallel processing | Sequential bottleneck | High | High |
```

### 10. Format the blueprint

Create the final deliverable:

**Text-based format (for markdown/docs):**

```markdown
# Service Blueprint: [Service Scenario]

## Scope
- **Scenario:** [Description]
- **User:** [Segment]
- **Start:** [Starting point]
- **End:** [Ending point]

## Blueprint

| Step | 1 | 2 | 3 | 4 | 5 |
|------|---|---|---|---|---|
| **Physical Evidence** | Homepage | Form | Confirmation | Status page | Letter |
| **User Actions** | Search | Fill form | Submit | Check status | Read decision |
| ═══ LINE OF INTERACTION ═══ |
| **Frontstage** | - | Validation | Email | Portal display | - |
| ═══ LINE OF VISIBILITY ═══ |
| **Backstage** | - | - | Queue | Worker review ⏱️ | Generate notice |
| ═══ LINE OF INTERNAL INTERACTION ═══ |
| **Support** | CMS | Forms engine | Workflow | Case mgmt | Notice system |

## Failure Points
1. ⚠️ [Description]
2. ⚠️ [Description]

## Key Insights
1. [Insight]
2. [Insight]

## Priority Opportunities
1. [Opportunity]
2. [Opportunity]
```

<!-- CUSTOMIZE: Your team may use visual tools:
- Miro/Mural service blueprint templates
- Figma/Lucidchart diagrams
- Agency-specific templates
Document your preferred format here. -->

## Completion Criteria

- [ ] Scope clearly defined (scenario, user, boundaries)
- [ ] All five swim lanes populated
- [ ] Lines of interaction, visibility, and internal interaction marked
- [ ] At least 3 failure points identified
- [ ] Wait times documented between key steps
- [ ] Support systems and dependencies mapped
- [ ] Insights and opportunities captured

## Examples

### Example: Blueprint Summary (Application Submission)

```markdown
# Service Blueprint: Benefits Application Submission

| Step | Search | Fill Application | Upload Docs | Submit | Confirm |
|------|--------|------------------|-------------|--------|---------|
| **Evidence** | Results page | Form UI | Upload UI | Button | Confirm page + email |
| **User** | Types query | Enters info | Selects files | Clicks submit | Sees confirm # |
| ═══ INTERACTION ═══ |
| **Frontstage** | Results display | Field validation | Progress bar | Spinner → success | Email sent |
| ═══ VISIBILITY ═══ |
| **Backstage** | - | - | Virus scan, OCR | Create case record | Assign to queue |
| ═══ INTERNAL ═══ |
| **Support** | Search index | Rules engine | DMS, OCR service | Case mgmt DB | Email service, Workflow |

**Failure Points:**
- ⚠️ Upload: Large files timeout (>10MB)
- ⚠️ Submit: Session expires after 30 min idle

**Wait Time:**
- ⏱️ Submit → First review: 3-5 business days (user not notified)
```

## References

- [Nielsen Norman Group: Service Blueprints](https://www.nngroup.com/articles/service-blueprints-definition/)
- [18F Methods: Service Blueprint](https://guides.18f.gov/methods/decide/service-blueprint/)
- [Practical Service Design: Blueprint Resources](https://www.practicalservicedesign.com/)

<!-- CUSTOMIZE: Add your team's specific references:
- Link to your blueprint templates
- Link to existing blueprints for reference
- Link to system architecture documentation
-->
