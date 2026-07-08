---
name: create-instant-email-notification
description: Implement a new immediate (non-digest) email notification for a TTA Hub application event, including constants, email template, handler, trigger helper, and call site
inputs:
  - name: event_description
    description: 'Plain-language description of the event that triggers the notification (e.g., "report submitted for approval by a collaborator")'
    required: true
  - name: recipient_description
    description: 'Who receives the notification (e.g., "collaborators on the report", "report author", "assigned approver")'
    required: true
  - name: subject_line
    description: 'Email subject line template (e.g., "Activity Report {displayId} - Submitted for approval")'
    required: true
  - name: email_body
    description: Plain-English email body content to render in the template
    required: true
  - name: trigger_location
    description: 'File path and function/route where the notification should be triggered (e.g., "src/routes/activityReports/handlers.js, submit handler")'
    required: true
outputs:
  - name: implementation_summary
    description: Summary of all files changed and the notification wiring
---

## Purpose

Implement a complete, end-to-end instant email notification in the TTA Smart Hub codebase. Instant notifications fire once per recipient immediately when an application event occurs. This skill walks through every required touch point — from constants to templates to handler to trigger — in the correct order so nothing is missed.

## Preconditions

- The event that triggers the notification is well-defined
- The set of recipients is known
- Subject line and body copy are provided or can be derived from inputs
- You have identified the call site (route or service) where the notification trigger will be invoked

---

## Steps

### 1. Gather context

Before writing any code, read the existing codebase to understand the current state:

```bash
# See all existing EMAIL_ACTIONS constants
grep -n "EMAIL_ACTIONS" src/constants.js | head -40

# See existing handlers to understand the naming pattern
grep -n "^export const notify" src/lib/mailer/index.js

# See existing trigger helpers
grep -n "^export const.*Notification" src/lib/mailer/index.js

# See how existing notifications are invoked at the call site
grep -n "Notification\|EMAIL_ACTIONS" <trigger_location_file>
```

Also read `docs/email_notifications.md` (the "New instant notification" recipe section) for full architectural context.

Understand:
- The naming convention for similar existing notifications
- Whether there is an existing `USER_SETTINGS.EMAIL.KEYS` entry for this event
- Whether the recipient is a single user or a set of users (changes the fan-out approach)

---

### 2. Add constants (`src/constants.js`)

Add a new `EMAIL_ACTIONS` key for the event:

```js
const EMAIL_ACTIONS = {
  // ... existing entries
  MY_NEW_EVENT: 'emailWhenMyNewEvent',   // camelCase string starting with emailWhen
};
```

**Naming rules:**
- Key: `SCREAMING_SNAKE_CASE` describing the event (e.g., `COLLABORATOR_REPORT_SUBMITTED_FOR_REVIEW`)
- Value: `camelCase` string starting with `emailWhen` (e.g., `'emailWhenCollaboratorReportSubmittedForReview'`)

> **Note:** The string value starting with `emailWhen` is intentional — constants.js auto-derives valid user settings from `EMAIL_ACTIONS` values with this prefix. Do not deviate from this prefix.

---

### 3. Create the email template (`email_templates/<template_name>/`)

Create a new folder under `email_templates/` at the repo root. The folder name should be the `snake_case` equivalent of your action key (e.g., `EMAIL_ACTIONS.MY_NEW_EVENT` → `email_templates/my_new_event/`).

Minimum required files:

**`html.pug`** — rendered HTML body:

```pug
style
  include ../email.css
p Hello,
p [Your message here. Use Pug interpolation for dynamic values: #{displayId}]
a(href=reportPath) Access this report in the TTA Hub.
p Best wishes,
  br
  | The TTA Hub team
```

**`subject.pug`** — email subject line:

```pug
= `Activity Report ${displayId}: [Subject text here]`
```

**Available template locals** (passed from handler via `locals: {}`):
- `displayId` — the report's human-readable ID (e.g., `R01-AR-17967`)
- `reportPath` — full URL to the report in the Hub (built from `TTA_SMART_HUB_URI` + report ID)
- Any other values you explicitly pass in the handler's `locals` object

Look at an existing template for reference — e.g., `email_templates/collaborator_report_submitted_for_review/html.pug`.

---

### 4. Write the handler (`src/lib/mailer/index.js`)

Add a named export function that processes a Bull job and sends the email:

```js
/**
 * Process function for myNewEvent jobs added to notification queue.
 * Sends email to [recipient description].
 */
export const notifyMyNewEvent = (job, transport = defaultTransport) => {
  if (process.env.SEND_NOTIFICATIONS !== 'true') return null;

  const { report, recipient } = job.data;  // destructure whatever you enqueue
  const { id, displayId } = report;
  logger.debug(
    `MAILER: Attempting to notify ${recipient.email} that [event description] for report ${displayId}`
  );

  const reportPath = `${process.env.TTA_SMART_HUB_URI}/activity-reports/${id}`;
  return sendIfEnabled([recipient.email], (toEmails) => {
    logger.debug(
      `MAILER: Notifying ${recipient.email} of [event description] for report ${displayId}`
    );
    return createEmailSender(transport).send({
      template: path.resolve(emailTemplatePath, 'my_new_event'),
      message: { to: toEmails },
      locals: { reportPath, displayId },   // add any other locals the template needs
    });
  });
};
```

**Key rules:**
- Always guard with `SEND_NOTIFICATIONS !== 'true'` returning `null` at the top — this is the no-op contract in non-sending environments
- Always use `sendIfEnabled(emails, callback)` — never call `createEmailSender` directly without this wrapper
- Pass only what the template needs in `locals`
- Use `logger.debug` for observability (import `logger` from `../logger` if not already imported in scope)

---

### 5. Register the handler in `processNotificationQueue` (`src/lib/mailer/index.js`)

Add the new action-handler pair to the `instantProcessors` array inside `processNotificationQueue`:

```js
const instantProcessors = [
  [EMAIL_ACTIONS.NEEDS_ACTION, notifyChangesRequested],
  [EMAIL_ACTIONS.SUBMITTED, notifyApproverAssigned],
  // ... existing entries
  [EMAIL_ACTIONS.MY_NEW_EVENT, notifyMyNewEvent],   // add here
];
```

This registers the handler so Bull dispatches jobs of this type to your new function.

---

### 6. Write the trigger helper (`src/lib/mailer/index.js`)

Add a named export that call sites use to enqueue jobs. The shape depends on whether you're notifying one user or many:

**Single recipient:**

```js
export const myNewEventNotification = (report, recipient) => {
  enqueueNotification(EMAIL_ACTIONS.MY_NEW_EVENT, { report, recipient });
};
```

**Multiple recipients (fan-out) — one job per recipient:**

```js
export const myNewEventNotification = (report, recipients) => {
  recipients.forEach((recipient) => {
    enqueueNotification(EMAIL_ACTIONS.MY_NEW_EVENT, { report, recipient });
  });
};
```

> **Why one job per recipient?** Each Bull job is independently retryable. Splitting by recipient prevents a single bad email address from blocking others.

---

### 7. Invoke the trigger at the call site

Import and call the trigger helper from the appropriate route or service. For multi-recipient cases (e.g., collaborators), **check user preferences before calling the trigger** so opted-out users are never enqueued.

**Multi-recipient fan-out with preference check:**

```js
import { myNewEventNotification } from '../lib/mailer';
import { userSettingOverridesById } from '../services/users';
import { EMAIL_ACTIONS, USER_SETTINGS } from '../constants';

// Inside your route/service handler:
if (recipients && recipients.length > 0) {
  const settings = await Promise.all(
    recipients.map((r) =>
      userSettingOverridesById(r.userId, EMAIL_ACTIONS.MY_NEW_EVENT)
    )
  );
  const toNotify = recipients.filter((_r, i) => {
    if (!settings[i]) return false;
    return settings[i].value === USER_SETTINGS.EMAIL.VALUES.IMMEDIATELY;
  });
  myNewEventNotification(savedReport, toNotify);
}
```

**Single recipient:**
For single-recipient cases (e.g., report author, assigned approver), the preference check is typically done inside the handler or by the calling code — follow the pattern of existing similar notifications.

> **Why filter before enqueuing?** Checking preferences before calling `enqueueNotification` ensures opted-out users are never added to the Bull queue, keeping queue volume proportional to actual sends.

---

### 8. Write tests

Add tests covering both the handler and the trigger helper. Follow the existing test file pattern — look for a test file alongside `src/lib/mailer/index.js` or in `src/lib/mailer/`.

**Handler test** (unit — mock the transport):

```js
describe('notifyMyNewEvent', () => {
  it('returns null when SEND_NOTIFICATIONS is not true', async () => {
    process.env.SEND_NOTIFICATIONS = 'false';
    const result = await notifyMyNewEvent({ data: { report: mockReport, recipient: mockUser } });
    expect(result).toBeNull();
  });

  it('sends email to recipient when SEND_NOTIFICATIONS is true', async () => {
    process.env.SEND_NOTIFICATIONS = 'true';
    const mockTransport = { ... };  // mock nodemailer transport
    await notifyMyNewEvent(
      { data: { report: mockReport, recipient: mockUser } },
      mockTransport,
    );
    // assert transport was called with expected email address and template
  });
});
```

**Trigger helper test** (unit — mock `enqueueNotification`):

```js
jest.mock('../lib/mailer', () => ({
  ...jest.requireActual('../lib/mailer'),
  enqueueNotification: jest.fn(),
}));

describe('myNewEventNotification', () => {
  it('enqueues one job per recipient', () => {
    myNewEventNotification(mockReport, [mockCollab1, mockCollab2]);
    expect(enqueueNotification).toHaveBeenCalledTimes(2);
  });
});
```

**Integration test** (if testing the fan-out at the call site):

```js
it('does not notify collaborators who have opted out', async () => {
  // Set up: one collaborator IMMEDIATELY, one not
  // Trigger the relevant route
  // Assert: notification was only sent to the opted-in collaborator
});
```

---

### 9. Lint and validate

```bash
# Backend lint
yarn lint

# Run tests targeted to your changed files
yarn jest --testPathPattern="mailer|<route_file_name>" --runInBand
```

Fix any lint errors before committing.

---

### 10. Update documentation

Add a row for your new notification in `docs/email_notifications.md` under the **Instant notifications** table:

```markdown
| `COLLABORATOR_REPORT_SUBMITTED_FOR_REVIEW` | `emailWhenCollaboratorReportSubmittedForReview` | Collaborator | Report creator submits for approval | `collaborator_report_submitted_for_review` |
```

Columns: Constant name | Setting key | Recipient | Trigger | Template folder

---

## Completion Criteria

- [ ] `EMAIL_ACTIONS` constant added in `src/constants.js` with `emailWhen` prefix value
- [ ] Email template folder created with `html.pug` and `subject.pug` (minimum)
- [ ] Handler function `notifyMyNewEvent` written with `SEND_NOTIFICATIONS` guard and `sendIfEnabled` wrapper
- [ ] Handler registered in `instantProcessors` array inside `processNotificationQueue`
- [ ] Trigger helper `myNewEventNotification` exported from `src/lib/mailer/index.js`
- [ ] Trigger called from correct call site with preference-check fan-out (for multi-recipient)
- [ ] Tests written for handler and trigger
- [ ] Lint passes (`yarn lint`)
- [ ] Row added to instant notifications table in `docs/email_notifications.md`

---

## Reference: Existing instant notification as a model

The `COLLABORATOR_REPORT_SUBMITTED_FOR_REVIEW` notification is a well-formed example to reference:

| Touch point | Location |
|-------------|----------|
| Constant | `src/constants.js` line ~168 |
| Handler | `src/lib/mailer/index.js` — `notifyCollaboratorReportSubmittedForReview` |
| Registration | `src/lib/mailer/index.js` — `instantProcessors` array |
| Trigger helper | `src/lib/mailer/index.js` — `collaboratorReportSubmittedForReviewNotification` |
| Call site w/ fan-out | `src/routes/activityReports/handlers.js` lines ~684-695 |
| Template | `email_templates/collaborator_report_submitted_for_review/` |

