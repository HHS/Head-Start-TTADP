# Email Notifications

This document describes how email notifications work in the TTA Smart Hub, including the full lifecycle from trigger to delivery, the major notification categories, and step-by-step recipes for registering new notification types.

---

## Table of Contents

1. [Architecture overview](#architecture-overview)
2. [Full email lifecycle](#full-email-lifecycle)
3. [Notification categories](#notification-categories)
   - [Instant notifications](#instant-notifications)
   - [Digest notifications](#digest-notifications)
   - [Training report notifications](#training-report-notifications)
   - [Special / always-send](#special--always-send)
4. [Key helpers](#key-helpers)
5. [Email templates](#email-templates)
6. [Environment variables](#environment-variables)
7. [How to register a new email type](#how-to-register-a-new-email-type)
   - [New instant notification](#new-instant-notification)
   - [New digest notification](#new-digest-notification)
   - [New training-report notification](#new-training-report-notification)
8. [Logging and observability](#logging-and-observability)

---

## Architecture overview

```
Application event
       │
       ▼
 enqueueNotification()  ─────►  Bull queue ("notifications")
                                       │
                      processNotificationQueue()
                              registers handlers
                                       │
                         ┌─────────────┼────────────────┐
                         ▼             ▼                 ▼
               notifyChangesRequested  notifyDigest  sendTrainingReportNotification
               notifyReportApproved    (+ 4 more)    (+ 4 more TR actions)
               notifyApproverAssigned
               notifyCollaboratorAssigned
               notifyRecipientReportApproved
                         │
                         ▼
               createEmailSender(transport)
                         │
                         ▼
               email-templates  ──►  nodemailer  ──►  SMTP
                         │
                         ▼
               logEmailNotification / logDigestEmailNotification
```

**Key packages:**

| Package | Role |
|---------|------|
| [`bull`](https://github.com/OptimalBits/bull) | Redis-backed job queue (`notificationQueue`) |
| [`email-templates`](https://github.com/forwardemail/email-templates) | Renders Pug/HTML templates and drives delivery |
| [`nodemailer`](https://nodemailer.com) | Low-level SMTP transport |

---

## Full email lifecycle

### Step 1 — Trigger (application code)

Anywhere in the application that needs to send an email calls a dedicated "notification" helper exported from `src/lib/mailer/index.js`:

```js
// Example: after an activity report is approved
import { reportApprovedNotification } from '../lib/mailer';
reportApprovedNotification(report, authorWithSetting, collabsWithSettings);
```

These helpers are thin — they build the job payload and call `enqueueNotification`.

### Step 2 — Enqueue

`enqueueNotification(action, data)` (internal to `src/lib/mailer/index.js`) adds the job to the Bull queue:

```js
const enqueueNotification = (action, data) => {
  try {
    notificationQueue.add(action, { ...data, ...referenceData() });
  } catch (err) {
    auditLogger.error(err);
  }
};
```

`referenceData()` (from `src/workers/referenceData.js`) stamps the job with environment metadata (app version, instance index, etc.).

### Step 3 — Queue processing

`processNotificationQueue()` must be called once at worker startup (see `src/lib/mailer/index.js`). It:

1. Registers `failed`/`completed` lifecycle handlers on the queue.
2. Iterates the three action groups and registers a Bull processor for each:

```
instantProcessors  →  [action, handler] pairs registered with notificationQueue.process
DIGEST_EMAIL_ACTIONS →  all use notifyDigest
TR_EMAIL_ACTIONS     →  all use sendTrainingReportNotification
```

### Step 4 — Handler execution

When a job is dequeued, Bull calls the registered handler with `(job, transport)`. The handler:

1. Checks `SEND_NOTIFICATIONS` via `sendIfEnabled` (instant/digest) or directly (TR).
2. Calls `createEmailSender(transport).send({ template, message, locals })`.
3. `email-templates` renders the Pug template with `locals`, then passes the rendered HTML/text to nodemailer.

### Step 5 — SMTP delivery

`nodemailer` delivers to the configured SMTP relay. The connection is created at module load (`defaultTransport`) using `SMTP_*` env vars.

### Step 6 — Log

`onCompletedNotification` / `onFailedNotification` call `logEmailNotification` or `logDigestEmailNotification` (from `src/lib/mailer/logNotifications.js`) to write structured audit records.

---

## Notification categories

### Instant notifications

Triggered synchronously by an application event, processed once per job.

| `EMAIL_ACTIONS` key | Trigger helper | Handler | Template |
|---------------------|----------------|---------|----------|
| `NEEDS_ACTION` | `changesRequestedNotification` | `notifyChangesRequested` | `changes_requested_by_manager` |
| `SUBMITTED` | `approverAssignedNotification` | `notifyApproverAssigned` | `manager_approval_requested` |
| `APPROVED` | `reportApprovedNotification` | `notifyReportApproved` | `report_approved` |
| `COLLABORATOR_ADDED` | `collaboratorAssignedNotification` | `notifyCollaboratorAssigned` | `collaborator_added` |
| `RECIPIENT_REPORT_APPROVED` | `programSpecialistRecipientReportApprovedNotification` | `notifyRecipientReportApproved` | `recipient_report_approved` |

All instant handlers share the same shape:

```js
export const notifyXxx = (job, transport = defaultTransport) => {
  // 1. Destructure data from job.data
  // 2. Return sendIfEnabled(addresses, (toEmails) =>
  //      createEmailSender(transport).send({ template, message: { to: toEmails }, locals })
  // );
};
```

### Digest notifications

Collected by a cron job (`src/lib/cron.js`) and queued as individual user jobs. All digest jobs are processed by the single `notifyDigest` handler using the shared `digest` / `digest_empty` templates.

**Standard digests** (auto-discovered by cron via `DIGEST_CONFIG`):

| `DIGEST_CONFIG` entry | `EMAIL_ACTIONS` key | User setting key |
|-----------------------|---------------------|-----------------|
| `COLLABORATOR_ADDED` | `COLLABORATOR_DIGEST` | `emailWhenAppointedCollaborator` |
| `CHANGE_REQUESTED` | `NEEDS_ACTION_DIGEST` | `emailWhenChangeRequested` |
| `SUBMITTED_FOR_REVIEW` | `SUBMITTED_DIGEST` | `emailWhenReportSubmittedForReview` |
| `APPROVAL` | `APPROVED_DIGEST` | `emailWhenReportApproval` |

**Special digest** (`recipientApprovedDigest`) — runs the same cron window but uses raw SQL to look up program specialists; it is not part of `DIGEST_CONFIG` and must be invoked explicitly in `runDigestJob`.

#### Cron schedule

| Job | Schedule | `EMAIL_DIGEST_FREQ` | Notes |
|-----|----------|---------------------|-------|
| Daily | 4:00 PM ET, Mon–Fri | `today` | Also sends TR task-due alerts |
| Weekly | 4:05 PM ET, Fridays | `this week` | — |
| Monthly | 4:10 PM ET, 28th–31st | `this month` | Skips non-last-day-of-month |

### Training report notifications

Queued by TR-lifecycle functions (`trCollaboratorAdded`, `trOwnerAdded`, `trSessionCreated`, `trEventComplete`) and by the `trainingReportTaskDueNotifications` digest function. All are processed by `sendTrainingReportNotification` which uses `SEND_NOTIFICATIONS === 'true' && !CI` as its guard.

**Alert-type reminders** are driven by `TR_NOTIFICATION_CONFIG_DICT`:

| Alert type | Trigger date | Recipients | Templates |
|------------|-------------|------------|-----------|
| `noSessionsCreated` | End date | Owner, collaborators | `tr_owner_reminder_no_sessions`, `tr_collaborator_reminder_no_sessions` |
| `missingEventInfo` | Start date | Owner, collaborators | `tr_owner_reminder_event`, `tr_collaborator_reminder_event` |
| `missingSessionInfo` | Start date | Owner, collaborators, POCs | `tr_owner_reminder_session`, `tr_collaborator_reminder_session`, `tr_poc_reminder_session` |
| `eventNotCompleted` | End date | Owner | `tr_owner_reminder_event_not_completed` |

Reminders are sent at day +20 (subject: "Reminder:"), day +40, and every 10 days after (subject: "Past due:").

### Special / always-send

`sendEmailVerificationRequestWithToken` bypasses the `SEND_NOTIFICATIONS` guard and always attempts delivery (guarded only by `filterAndDeduplicateEmails`). It is used for account email verification flows.

---

## Key helpers

All helpers live in `src/lib/mailer/index.js` unless noted.

### `createEmailSender(transport?)`

Returns a configured `email-templates` `Email` instance. Reads `FROM_EMAIL_ADDRESS` at call time so tests can override `process.env` cleanly.

```js
const createEmailSender = (transport = defaultTransport) => {
  const { FROM_EMAIL_ADDRESS } = process.env;
  return new Email({
    message: { from: FROM_EMAIL_ADDRESS },
    send,          // true in production or when SEND_NON_PRODUCTION_NOTIFICATIONS=true
    transport,
    htmlToText: { wordwrap: 120 },
  });
};
```

### `sendIfEnabled(emailAddresses, sendFn)`

Standard guard for instant and digest handlers. Returns `null` (no-op) when `SEND_NOTIFICATIONS !== 'true'` or after deduplication the recipient list is empty.

```js
const sendIfEnabled = (emailAddresses, sendFn) => {
  if (process.env.SEND_NOTIFICATIONS !== 'true') return null;
  const toEmails = filterAndDeduplicateEmails(emailAddresses);
  if (toEmails.length === 0) return null;
  return sendFn(toEmails);
};
```

### `enqueueNotification(action, data)`

Safely adds a job to the Bull queue, swallowing errors into `auditLogger`. Use this in all notification-trigger helpers rather than calling `notificationQueue.add` directly.

### `filterAndDeduplicateEmails(emails)`

Flattens, deduplicates, and removes `no-send_*` addresses. Used by every send path.

### `DIGEST_CONFIG` (exported array)

Declarative registry of standard digest types. The cron runner (`src/lib/cron.js`) iterates this so newly added entries are automatically scheduled without changing cron.js.

```js
// src/lib/mailer/index.js
export const DIGEST_CONFIG = [
  { settingKey, reportFetcher, actionType, logKey },
  // ... one entry per digest type
];
```

### `digestForSetting({ settingKey, reportFetcher, actionType, logKey, freq, subjectFreq })`

Internal shared runner for all standard digest types. Queries users who have the given `settingKey` set to `freq`, fetches the relevant reports for each, and enqueues one digest job per user.

---

## Email templates

Templates are Pug files located in `email_templates/` (repo root). Each template folder contains at minimum `html.pug` and `subject.pug`.

```
email_templates/
├── changes_requested_by_manager/
├── collaborator_added/
├── digest/
├── digest_empty/
├── email_verification/
├── manager_approval_requested/
├── recipient_report_approved/
├── report_approved/
├── tr_collaborator_added/
├── tr_event_complete/
├── tr_event_imported/
├── tr_owner_reminder_event/
├── tr_owner_reminder_event_not_completed/
├── tr_owner_reminder_no_sessions/
├── tr_owner_reminder_session/
├── tr_poc_reminder_session/
├── tr_session_created/
└── ...
```

The template path passed to `createEmailSender(transport).send()` is resolved with:

```js
path.resolve(emailTemplatePath, 'template_folder_name')
// where emailTemplatePath = path.join(process.cwd(), 'email_templates')
```

---

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SEND_NOTIFICATIONS` | Yes | `'true'` to actually send instant/digest emails. When absent, handlers return `null` (no-op). |
| `SEND_NON_PRODUCTION_NOTIFICATIONS` | No | `'true'` to send in non-production environments (sets `send: true` on the `Email` instance). |
| `FROM_EMAIL_ADDRESS` | Yes | The `From:` address on all outgoing mail. |
| `TTA_SMART_HUB_URI` | Yes | Base URL used to build report links in email bodies. |
| `SMTP_HOST` | Yes | SMTP relay hostname. |
| `SMTP_PORT` | Yes | SMTP port (e.g. `587`). |
| `SMTP_USER` | Yes | SMTP auth username. |
| `SMTP_PASSWORD` | Yes | SMTP auth password. |
| `SMTP_SECURE` | No | Set to `'false'` to disable TLS (default: TLS on). |
| `SMTP_IGNORE_TLS` | No | Set to `'false'` to require TLS (default: TLS ignored). |
| `SEND_TRAININGREPORTTASKDUENOTIFICATION` | No | `'true'` to enable TR task-due alerts in the daily cron job. |
| `CI` | No | When truthy, `sendTrainingReportNotification` and TR trigger helpers (`trCollaboratorAdded`, etc.) are suppressed. |

---

## How to register a new email type

### New instant notification

An instant notification is triggered by an application event and delivered once per recipient immediately.

**1. Add an `EMAIL_ACTIONS` constant** (`src/constants.js`):

```js
const EMAIL_ACTIONS = {
  // ... existing entries
  MY_NEW_EVENT: 'myNewEvent',   // add here
};
```

**2. Create the email template** (`email_templates/my_new_event/`):

```
email_templates/my_new_event/
├── html.pug    ← rendered HTML body
├── subject.pug ← email subject line
└── text.pug    ← (optional) plain-text body
```

**3. Write the handler** in `src/lib/mailer/index.js`:

```js
export const notifyMyNewEvent = (job, transport = defaultTransport) => {
  const { report, someUser } = job.data;
  const { id, displayId } = report;
  const reportPath = `${process.env.TTA_SMART_HUB_URI}/activity-reports/${id}`;

  return sendIfEnabled([someUser.email], (toEmails) =>
    createEmailSender(transport).send({
      template: path.resolve(emailTemplatePath, 'my_new_event'),
      message: { to: toEmails },
      locals: { reportPath, displayId, someUser },
    })
  );
};
```

**4. Register the handler** in `processNotificationQueue` (same file):

```js
const instantProcessors = [
  // ... existing entries
  [EMAIL_ACTIONS.MY_NEW_EVENT, notifyMyNewEvent],   // add here
];
```

**5. Write the trigger helper** (call from wherever the event occurs):

```js
export const myNewEventNotification = (report, someUser) => {
  enqueueNotification(EMAIL_ACTIONS.MY_NEW_EVENT, { report, someUser });
};
```

**6. Invoke the trigger** from your service or route handler:

```js
import { myNewEventNotification } from '../lib/mailer';
myNewEventNotification(report, someUser);
```

---

### New digest notification

A digest notification is sent on a schedule (daily/weekly/monthly) and batches activity since the last run.

**1. Add an `EMAIL_ACTIONS` constant** and a `USER_SETTINGS.EMAIL.KEYS` constant (`src/constants.js`):

```js
const USER_SETTINGS = {
  EMAIL: {
    KEYS: {
      // ... existing
      MY_DIGEST: 'emailWhenMyDigestThing',   // add here
    },
  },
};

const EMAIL_ACTIONS = {
  // ... existing
  MY_DIGEST: 'myDigest',   // add here
};
```

**2. Create a report fetcher** (or reuse an existing service function from `src/services/activityReports.js`):

```js
// src/services/activityReports.js — add if needed
export const activityReportsMyEventByDate = (userId, date) => ...
```

**3. Add a `DIGEST_CONFIG` entry** in `src/lib/mailer/index.js`:

```js
export const DIGEST_CONFIG = [
  // ... existing entries
  {
    settingKey: USER_SETTINGS.EMAIL.KEYS.MY_DIGEST,
    reportFetcher: activityReportsMyEventByDate,
    actionType: EMAIL_ACTIONS.MY_DIGEST,
    logKey: 'MyDigest',
  },
];
```

**4. Add the action to `DIGEST_EMAIL_ACTIONS`** (same file, near `processNotificationQueue`):

```js
const DIGEST_EMAIL_ACTIONS = [
  // ... existing
  EMAIL_ACTIONS.MY_DIGEST,   // add here
];
```

**5. Export a thin wrapper** (preserves named public API):

```js
export async function myDigest(freq, subjectFreq) {
  return digestForSetting({ ...DIGEST_CONFIG.find(c => c.actionType === EMAIL_ACTIONS.MY_DIGEST), freq, subjectFreq });
}
```

**6. Create the email template** (`email_templates/digest/` or a new folder if the layout differs).

> The cron runner iterates `DIGEST_CONFIG` automatically — no changes to `src/lib/cron.js` are needed. The new digest will run on all three schedules (daily/weekly/monthly) based on the user's preference setting.

---

### New training-report notification

TR notifications are triggered by TR lifecycle events and sent through `sendTrainingReportNotification`.

**1. Add an `EMAIL_ACTIONS` constant** (`src/constants.js`):

```js
const EMAIL_ACTIONS = {
  // ... existing
  TRAINING_REPORT_MY_TR_EVENT: 'trainingReportMyTrEvent',
};
```

**2. Create the email template** (`email_templates/tr_my_tr_event/`).

**3. Register the action in `TR_EMAIL_ACTIONS`** (`src/lib/mailer/index.js`):

```js
const TR_EMAIL_ACTIONS = [
  // ... existing
  EMAIL_ACTIONS.TRAINING_REPORT_MY_TR_EVENT,
];
```

**4. Write the trigger function**:

```js
export const trMyTrEvent = async (event) => {
  if (process.env.CI) return;
  try {
    const user = await userById(event.someUserId, true);
    const emailTo = filterAndDeduplicateEmails([user.email]);
    if (!emailTo.length) return;

    const data = {
      displayId: event.data.eventId,
      report: { displayId: event.data.eventId },
      emailTo,
      reportPath: `${process.env.TTA_SMART_HUB_URI}/training-report/${event.data.eventId}`,
      debugMessage: `MAILER: Notifying ${user.email} about TR ${event.id}`,
      templatePath: 'tr_my_tr_event',
      ...referenceData(),
    };

    notificationQueue.add(EMAIL_ACTIONS.TRAINING_REPORT_MY_TR_EVENT, data);
  } catch (err) {
    auditLogger.error(err);
  }
};
```

**5. For alert-type reminders** (scheduled, date-diff driven), add an entry to `TR_NOTIFICATION_CONFIG_DICT` instead of a standalone function:

```js
const TR_NOTIFICATION_CONFIG_DICT = {
  // ... existing
  myAlertType: {
    toDiff: 'startDate',                    // or 'endDate'
    debug: (email, eventId) => `MAILER: ...`,
    emails: [
      {
        templatePath: 'tr_my_alert_template',
        users: 'ownerId',                   // field on alert: ownerId | collaboratorIds | pocIds
        reportPath: ({ eventId }) => `${process.env.TTA_SMART_HUB_URI}/training-report/${eventId}`,
      },
    ],
  },
};
```

The `trainingReportTaskDueNotifications` function (called by the daily cron job when `SEND_TRAININGREPORTTASKDUENOTIFICATION=true`) will automatically pick up the new alert type.

---

## Logging and observability

- **Successful delivery** — `onCompletedNotification` logs at `info` level and calls `logEmailNotification` / `logDigestEmailNotification`.
- **Delivery failure** — `onFailedNotification` logs at `error` level via `auditLogger` and the same log helpers.
- **Suppressed sends** — when `sendIfEnabled` returns `null` (notifications disabled or empty recipient list), `onCompletedNotification` logs a "Did not send … preferences are not set or marked as no-send" message.
- **All logs** use the shared `logger` and `auditLogger` from `src/logger.js`.
