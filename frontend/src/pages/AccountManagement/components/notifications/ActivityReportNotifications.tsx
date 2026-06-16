import React from 'react';
import NotificationsGroupController from './NotificationsGroupController';
import NotificationsRow from './NotificationsRow';

export default function ActivityReportNotifications() {
  return (
    <div>
      <div className="display-flex flex-align-center">
        <div className="flex-1 text-bold">Event</div>
        <div className="text-bold width-10">In-app</div>
        <div className="text-bold width-card">Email</div>
      </div>
      <NotificationsGroupController
        groupName="ActivityReports"
        ids={[
          'WhenReportSubmittedForReview',
          'WhenChangeRequested',
          'WhenAppointedCollaborator',
          'WhenRecipientReportApprovedProgramSpecialist',
          'WhenReportApproval',
        ]}
        label="Set preferences for all Activity Report notifications"
      />
      <hr />
      <NotificationsRow
        id="WhenReportSubmittedForReview"
        label="Someone submits an Activity Report for my approval."
      />
      <NotificationsRow
        // todo: needs implementation, new notification type
        id="WhenCollaboratorReportSubmittedForReview"
        label="A Creator submits an Activity Report for approval that I am a Collaborator on."
      />
      <NotificationsRow
        // todo: needs implementation, new notification type
        id="WhenCreatorReportCollaboratorSubmittedForReview"
        label="A Collaborator submits an Activity Report for approval that I created."
      />
      <NotificationsRow
        id="WhenChangeRequested"
        label="A manager requests changes to an activity report that I created or collaborated on."
      />
      <NotificationsRow
        id="WhenReportApproval"
        label="A manager approves an Activity Report that I created or collaborated on."
      />
      <NotificationsRow
        id="WhenAppointedCollaborator"
        label="I'm added as a collaborator on an activity report."
      />
      <NotificationsRow
        id="WhenRecipientReportApprovedProgramSpecialist"
        label={
          <>
            <em>Program specialists only:</em>
            <br /> One of my recipients&apos; activity reports is available.
          </>
        }
      />
    </div>
  );
}
