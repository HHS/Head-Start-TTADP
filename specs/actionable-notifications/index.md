# Actionable Notifications

_Technical design/specification for review and implementation._

The actionable notification epic encompasses both several new email notifications and an entirely new system of in-app notifications. In-app notificatiions can be triggered by a variety of different events in lifecycles of disparate entities (Activity Reports, Training Reports, Collab Reports)

[Prototype is available in Figma](https://www.figma.com/design/LNF1ux5pEABIOD10T2oBUP/Actionable-Notifications?node-id=1328-11078&p=f&m=dev)

This document is meant to be a living record of specifications and decisions while the feature is being developed. This document will be used to synthesize documentation within this repo as a final task in the epic, and then can be deleted.

## Requirements (from Jira)

- The solution should be scalable. The solution should be able to accomodate the addition of new notification types over time. 
- The solution should account for both in app and email notifications. 
- The solution should account for user opt ins and outs. 
- The solution should account for both one off emails and digest emails. 

## Principles for reference

- Avoid the use of hooks to create notifications. Doing it inline (for example, right when changes are requested to an activity report rather than a hook that requests to a status change) makes it traceable and reduces the need to query the database again for associated metadata in a new context
- Use Typescript throughout, strictly
- Validate requests with Joi

## Steps

### Database Tables/Sequelize Models

**Ticket #1: Create Notifications schema**
Points: 5

- userId: FK to users, nullable
- entityId: ID of the source entity, nullable (polymorphic; database FK enforcement is not possible unless the schema uses separate typed columns/tables)
  Potential links are: group, communicationLog, activityReport, collabReport, trainingReport, sessionReport
  https://sequelize.org/docs/v6/advanced-association-concepts/polymorphic-associations/
- type: NOTIFICATION_TYPE[enum]
- link: computed link
- label: label for link
- text: computed message (see notification configuration, next section)
- isArchived: Boolean, default false
- isViewed: Boolean, default false

```timestamps: true```
```paranoid: false```

Create a migration with this database table, and a short-lived feature flag (`actionable_notifications`)to use during development.
Create simple seeded data, also for use during development

### Notification configuration

As example. These will be created as we build out notifications

```ts

// also add to UserSettings enum
// @src/constants.js

const NOTIFICATION_TYPES = {
    // for example
    ACTIVITY_REPORT_CHANGES_REQUESTED: 'emailWhenChangeRequested',
};

const NOTIFICATION_CONFIGURATION = {
    // and so forth. We need custom functions for each type since each notification has bespoke text
    [NOTIFICATION_TYPES.ACTIVITY_REPORT_CHANGES_REQUESTED]: {
        textFn: ({ userName, recipientName }) => `${userName} has requested changes to your Activity Report for ${recipientName}.`,
        // whether or not we display primary button style or outline button style ("view" vs "take action")
        actionable: true,
        linkFn: ({id}) => `/activity-report/${id}`,
        linkText: () => 'View AR',
    },
}

```

### Services

**Ticket #2: Create Notifications service**
Points: 8

```createNotification(userId, entityId, NOTIFICATION_TYPE, { metadata })```

Accepts a userId, an entityId (ex: reportId), a notification type, and metadata containing params intended to compute text from the enum. The function should:
- check user for notification preferences
- create a notification
- If possible: Typescript should enforce the parameters match the expected given a NOTIFICATION_TYPE

Ideally, this function should be **plug and play**. See Registering a new notification, below. 

```createGlobalNotification```

```updateNotification(notificationId, updatedNotification)```
Updates notififications, atomically (only _isArchived_ and _isViewed_ will be updated, should be enforced via code, in both the service, the joi validation, and the model configuration if possible)

```js
// just an example
await Notification.update(
    updatedNotification,
    {
        where: {
            id: notificationId,
        }
    }
);

```

```deleteNotification(notificationId)```
Deletes a notification with the given ID

```getNotifications(scopes)```
Retrieve all notifications for given scopes. Includes pagination and sorting. offset based, consistent with the rest of the site

### Scopes

**Ticket #3: Create required scopes for Notifications**
Points: 5

- userId
- isGlobal - retrieves all notifications with no user ID
- createdAt

**Ticket #4: Identify and handle other scopes based on design**
Points: 3/per, should probably be deferred to end of epic

### Handlers

**Ticket #5: Handlers for Notifications**
Points: 3

Create user level notifications and delete DO not need handlers. They will only be called programtically. Will need a handler with permissions and validation for updating and getting notifications. Users should only be able to update and view their own notifications. Admins will be able to create global notifications.

### Scheduled tasks

**Ticket #6: Create job to cleanup notifications over thirty days**
Points: 3

1. Runs every night
2. getNotifications with a createdAt scope < LAST_THIRTY_DAYS & isGlobal: false
3. Delete notifications

### Creating a new notification

The process of registering a new notification on the backend: register a new type in the `enum`s. Add `createNotification` into the appropriate service or handler (varies based on specifics of notification). Be sure to pass all metadata necessary (Typescript, validation can help with that)

### Emails
**Ticket #7: DRY up and simplify existing code for adding a new email notification**
Points: 3

Make registering a new email/digest simpler since we'll be adding many more

### Frontend tickets

To be expanded upon in conjunction with PM

- Refactor home page to use new tiled markup
- Create notifications page/table, less filter component
- Create notifications preference page
- Move email opt-in
- Modify site header to add bell component/update avatar menu 
- Modify admin interface for creating site alerts to also create notifications
- Add filter component to notifications page/table

Note: additional tickets will be needed to *register* the new notifications/emails.
