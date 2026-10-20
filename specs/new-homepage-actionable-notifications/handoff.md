<!--
SPEC HANDOFF FORM — blank template.

Copy to specs/<feature-slug>/handoff.md, fill it in, then handoff to an agent:
  "Use the spec-handoff skill with specs/<feature-slug>/handoff.md"
-->

# Spec handoff: New homepage design (going out with actionable notifications)

**Slug:** new-homepage-actionable-notifications

---

## 1. Definition of work

| | |
|---|---|
| Jira issue or epic | https://jira.acf.gov/browse/TTAHUB-5799 |
| Is this an epic with child tickets? | yes / no |
| Figma file | https://www.figma.com/design/LNF1ux5pEABIOD10T2oBUP/Actionable-Notification |
| Figma frames that matter | 1275-68189 |

Paste the ticket body and its acceptance criteria here:

```
Build the new Home page on the Hub. 

Checklist

    New left nav item: Home
        First left nav item, above TTA Hub Reporting
    Home Page Title: Welcome to the TTA Hub, [User Name]
    Manage Account widget 
        Title: Manage account 
        Text: View profile and My Groups
        Button: Manage account
        Routes to the manage account page, same place that the "Account Management" option in the utility menu goes to 
    Notifications widget 
        Title: Notifications 
        Text: Set up and take action on TTA Hub tasks and messages. 
        Button: View notifications
        Routes to the new notifications page 
    What's new 
        Title: What's new
        Text: Stay up to date with new TTA Hub features. 
        Button: View updates
        Routes to the What's new page 
    User guide widget 
        Title: User guide 
        Text: Technical documents and help articles. 
        Button: View user guide 
        Routes to TTA Hub user guide in Confluence 
    Contact support widget 
        Title: Contact support 
        Text: Request support for the TTA Hub. 
        Button: Contact support 
        Routes to the Smartsheet support request form 
    See Figma for spacing guidelines 

Design: https://www.figma.com/design/LNF1ux5pEABIOD10T2oBUP/Actionable-Notifications?node-id=1275-68189&m=dev 
```

---

## 2. Why

Currently the homepage only displays a generic welcome message. With the launch of actionable notifications, we are
going to use the notification to provide useful links to ALL our users.

---

## 3. Boundaries

Only update the homepage. A logical gate within @frontend/src/Routes.js should be sufficient to make sure only feature flagged users see the "new" homepage

---

## 4. The things Figma and Jira don't say

| Question | Answer |
|---|---|
| Empty state — what shows when there's no data? | Hard coded, static content; no empty state needed  |
| Error states — what can fail, and what does the user see? | Hard coded, static content; no error state needed |
| Loading state | Hard coded, static content; no loading state needed |
| Hover / focus / disabled states — are they drawn in Figma? where? | Not provided, take a guess and I will validate after implementations |
| Character limits, truncation, overflow | Content hard coded |
| Reading order and focus management concerns | Document should be focusable in document order/reading order |
| Screen-reader announcements needed (live regions, status) | No live regions; content should be navigated in a logical order|
| Who can see this? who can act on it? | See #5 technical constraints|
| What happens on a slow or failed request? | No special handling needed |
| Anything mobile-specific or responsive-breakpoint-specific | The content should degrade to one column; content within the boxes should also degrade in a flexible and consistent manner |

---

## 5. Technical constraints

This new homepage will replace the "/" route at @frontend/src/pages/Home/index.js
The content should be gated behind a feature flag "actionable_notifications"
One component should encompass each "home page link" box, itemized in the jira ticket