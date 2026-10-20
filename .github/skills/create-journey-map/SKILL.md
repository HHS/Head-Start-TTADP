---
name: create-journey-map
description: Create a user journey map documenting the end-to-end experience of a user accomplishing a goal
inputs:
  - name: persona
    description: The user persona or role whose journey is being mapped
    required: true
  - name: goal
    description: The outcome the user is trying to achieve
    required: true
  - name: scope
    description: The boundaries of the journey (starting and ending points)
    required: false
outputs:
  - name: journey_map
    description: Complete journey map with phases, touchpoints, emotions, and opportunities
---

## Purpose

Guide the creation of user journey maps that visualize the complete experience of a user interacting with a service, identifying pain points and opportunities for improvement.

## Preconditions

- User persona is defined or can be inferred from research
- The service or process to map exists (current state) or is being designed (future state)
- Access to user research, analytics, or subject matter experts for validation

## Steps

### 1. Define the journey scope

Establish clear boundaries for the map:

| Element | Question to Answer |
|---------|-------------------|
| **Persona** | Who is this journey for? Be specific about their context and needs |
| **Scenario** | What situation triggers this journey? |
| **Goal** | What outcome is the user trying to achieve? |
| **Starting point** | Where does the journey begin? (First awareness, trigger event) |
| **Ending point** | Where does it end? (Goal achieved, service concluded) |

**Government context considerations:**

- Is this a mandatory interaction (taxes, licensing) or voluntary (benefits enrollment)?
- What is the user's familiarity with government processes?
- Are there legal deadlines or time constraints?

<!-- CUSTOMIZE: Add your project's specific scoping questions:
- What channels are in scope (web, phone, in-person, mail)?
- Which agency touchpoints are included?
-->

### 2. Identify journey phases

Break the journey into logical phases. Common government service phases:

| Phase | Description | Example |
|-------|-------------|---------|
| **Awareness** | User learns they need or can access the service | Sees eligibility notice |
| **Research** | User gathers information about requirements | Reads FAQ, calls helpline |
| **Preparation** | User collects necessary documents/information | Gathers ID, proof of income |
| **Application** | User submits request or completes transaction | Fills out online form |
| **Processing** | Service processes the request (often invisible to user) | Agency reviews application |
| **Resolution** | User receives outcome and any follow-up | Gets approval letter |
| **Ongoing** | Continued interaction if applicable | Annual renewals |

Adapt phases to your specific service. Aim for 4-7 phases.

### 3. Map touchpoints and channels

For each phase, document how the user interacts with the service:

```markdown
### Phase: [Phase Name]

**Touchpoints:**
- [Specific interaction point, e.g., "Homepage eligibility screener"]
- [Another touchpoint]

**Channels:**
- [ ] Web (desktop)
- [ ] Web (mobile)
- [ ] Phone/call center
- [ ] In-person (field office)
- [ ] Mail/paper
- [ ] Email
- [ ] SMS/text
- [ ] Mobile app

**User actions:**
- [What the user does in this phase]

**System/staff actions:**
- [What happens behind the scenes]
```

<!-- CUSTOMIZE: Add channels specific to your agency:
- [ ] Video call
- [ ] Chat/chatbot
- [ ] Third-party partners
-->

### 4. Capture the emotional journey

Document the user's emotional state at each phase:

| Indicator | Positive | Neutral | Negative |
|-----------|----------|---------|----------|
| **Emotion** | Confident, relieved | Uncertain, waiting | Frustrated, anxious |
| **Thinking** | "This is straightforward" | "I hope I did this right" | "Why is this so hard?" |
| **Pain level** | Low friction | Moderate effort | High friction |

Use a simple scale or emoji notation:

- 😊 Positive experience
- 😐 Neutral experience
- 😟 Negative experience / pain point

### 5. Identify pain points

Document friction, frustration, and failure points:

```markdown
## Pain Points

### Phase: [Phase Name]

| Pain Point | Severity | Evidence |
|------------|----------|----------|
| [Description of the problem] | High/Medium/Low | [Research finding, analytics, quote] |
```

**Common government service pain points:**

- Jargon and complex language
- Unclear eligibility requirements
- Document gathering burden
- Long wait times (processing, phone queues)
- Status uncertainty ("Where is my application?")
- Channel switching required (start online, must visit in-person)
- Accessibility barriers
- Authentication friction (login.gov, ID verification)

### 6. Surface opportunities

For each pain point, identify potential improvements:

```markdown
## Opportunities

### Phase: [Phase Name]

| Opportunity | Addresses Pain Point | Effort | Impact |
|-------------|---------------------|--------|--------|
| [Improvement idea] | [Related pain point] | High/Medium/Low | High/Medium/Low |
```

**Opportunity categories:**

- **Quick wins** - Low effort, high impact
- **Strategic investments** - High effort, high impact
- **Fill-ins** - Low effort, low impact (do if easy)
- **Deprioritize** - High effort, low impact (avoid)

### 7. Validate and refine

Before finalizing:

- [ ] Review with users or user researchers
- [ ] Cross-check with analytics data
- [ ] Validate with frontline staff (call center, field office)
- [ ] Identify gaps in knowledge (mark with "needs research")

### 8. Format the journey map

Create a visual or structured representation:

**Text-based format (for markdown/docs):**

```markdown
# Journey Map: [Persona] - [Goal]

## Overview
- **Persona:** [Name/description]
- **Scenario:** [Trigger situation]
- **Goal:** [Desired outcome]
- **Scope:** [Start] → [End]

## Journey Phases

| Phase | Touchpoints | Actions | Emotions | Pain Points | Opportunities |
|-------|-------------|---------|----------|-------------|---------------|
| Awareness | ... | ... | 😐 | ... | ... |
| Research | ... | ... | 😟 | ... | ... |
| ... | ... | ... | ... | ... | ... |

## Key Insights
1. [Insight 1]
2. [Insight 2]

## Priority Opportunities
1. [Top opportunity]
2. [Second priority]
```

<!-- CUSTOMIZE: Your team may use visual tools:
- Miro/Mural boards
- Figma journey map templates
- Specific agency templates
Document your preferred format and templates here. -->

## Completion Criteria

- [ ] Persona and goal clearly defined
- [ ] 4-7 journey phases identified
- [ ] Touchpoints and channels documented for each phase
- [ ] Emotional journey captured with evidence
- [ ] At least 3 pain points identified with severity
- [ ] Opportunities mapped to pain points
- [ ] Validated with research data or stakeholders

## Examples

### Example: Journey Map Summary Table

```markdown
# Journey Map: Maria (First-time Benefits Applicant) - Apply for Food Assistance

| Phase | Touchpoints | Emotions | Key Pain Points | Opportunities |
|-------|-------------|----------|-----------------|---------------|
| Awareness | Friend referral, web search | 😐 Uncertain | Didn't know she qualified | Proactive outreach |
| Research | Agency website, FAQ | 😟 Overwhelmed | Jargon, unclear requirements | Plain language rewrite |
| Preparation | Document checklist | 😟 Anxious | Many documents needed | Document upload guidance |
| Application | Online form | 😐 → 😟 | Form timeout, lost progress | Auto-save, progress bar |
| Processing | Status portal, email | 😟 Waiting | No status updates for 2 weeks | Proactive notifications |
| Resolution | Approval letter, EBT card | 😊 Relieved | Mailed card took 10 days | Digital card option |
```

## References

- [Nielsen Norman Group: Journey Mapping 101](https://www.nngroup.com/articles/journey-mapping-101/)
- [18F Methods: Journey Mapping](https://guides.18f.gov/methods/decide/journey-mapping/)
- [USDS Digital Services Playbook](https://playbook.cio.gov/)

<!-- CUSTOMIZE: Add your team's specific references:
- Link to your journey map templates
- Link to existing journey maps for reference
- Link to research repository
-->
