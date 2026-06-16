import React from 'react';
import NotificationsGroupController from './NotificationsGroupController';
import NotificationsRow from './NotificationsRow';
/**
 * Note that none of these are implemented yet here and mocked out only for UI verification
 * @returns
 */
export default function TrainingReportNotifications() {
  return (
    <div>
      <div className="display-flex flex-align-center">
        <div className="flex-1 text-bold">Event</div>
        <div className="text-bold width-10">In-app</div>
        <div className="text-bold width-card">Email</div>
      </div>
      <NotificationsGroupController
        groupName="TrainingReports"
        ids={[
          'WhenAddedAsPocTrainingReport',
          'WhenAddedAsCollaboratorTrainingReport',
          'WhenSessionReviewRequestedTrainingReport',
          'WhenSessionChangesRequestedTrainingReport',
          'WhenSessionDetails20DaysCreatorCollaborator',
          'WhenSessionDetails20DaysPoc',
          'WhenNoSessionsCreatorCollaborator',
          'WhenEventDetails20DaysCreatorCollaborator',
          'WhenEventNotCompleted',
        ]}
        label="Set preferences for all Training Report notifications"
      />
      <hr />
      <NotificationsRow
        // todo: needs implementation, new notification type
        id="WhenAddedAsPocTrainingReport"
        label="I'm added as a Regional point of contact on a Training Report."
      />
      <NotificationsRow
        // todo: needs implementation, new notification type
        id="WhenAddedAsCollaboratorTrainingReport"
        label="I'm added as a collaborator on a Training Report."
      />

      <NotificationsRow
        // todo: needs implementation, new notification type
        id="WhenSessionReviewRequestedTrainingReport"
        label="Someone submits an event session for my review."
      />
      <NotificationsRow
        // todo: needs implementation, new notification type
        id="WhenSessionChangesRequestedTrainingReport"
        label="A manager requests changes to an event session that I created or collaborated on."
      />

      <NotificationsRow
        // todo: needs implementation, new notification type
        id="WhenEventDetails20DaysCreatorCollaborator"
        label="Event details are not completed within 20 days of the event start date where I'm the Creator or Collaborator."
      />

      <NotificationsRow
        // todo: needs implementation, new notification type
        id="WhenSessionDetails20DaysCreatorCollaborator"
        label="Session details are not completed within 20 days of the session start date where I'm the Creator or Collaborator."
      />

      <NotificationsRow
        // todo: needs implementation, new notification type
        id="WhenSessionDetails20DaysPoc"
        label="Session details are not completed within 20 days of the session start date where I'm the Regional point of contact."
      />

      <NotificationsRow
        // todo: needs implementation, new notification type
        id="WhenNoSessionsCreatorCollaborator"
        label="No sessions have been created within 20 days of the event end date where I'm the Event Creator or Collaborator."
      />

      <NotificationsRow
        // todo: needs implementation, new notification type
        id="WhenEventNotCompleted"
        label="Event creator has not completed event within 20 days of event end date."
      />
    </div>
  );
}
