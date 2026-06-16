import React from 'react';
import NotificationsGroupController from './NotificationsGroupController';
import NotificationsRow from './NotificationsRow';
/**
 * Note that none of these are implemented yet here and mocked out only for UI verification
 * @returns
 */
export default function CollabReportNotifications() {
  return (
    <div>
      <div className="display-flex flex-align-center">
        <div className="flex-1 text-bold">Event</div>
        <div className="text-bold width-10">In-app</div>
        <div className="text-bold width-card">Email</div>
      </div>
      <NotificationsGroupController
        groupName="CollabReports"
        ids={[
          'WhenCollabReportSubmittedForReview',
          'WhenCollaborationReportSubmittedForReview',
          'WhenCreatorCollaborationReportCollaboratorSubmittedForReview',
          'WhenCollaborationChangeRequested',
          'WhenCollaborationReportApproved',
          'WhenAddedAsCollaborationCollaborator',
        ]}
        label="Set preferences for all Collaboration Report notifications"
      />
      <hr />
      <NotificationsRow
        id="WhenCollabReportSubmittedForReview"
        label="Someone submits a Collaboration Report for my approval."
      />
      <NotificationsRow
        id="WhenCollaborationReportSubmittedForReview"
        label="A Creator submits a Collaboration Report for approval that I am a Collaborator on."
      />
      <NotificationsRow
        // todo: needs implementation, new notification type
        id="WhenCreatorCollaborationReportCollaboratorSubmittedForReview"
        label="A Collaborator submits an Collaboration Report for approval that I created."
      />
      <NotificationsRow
        id="WhenCollaborationChangeRequested"
        label="A manager requests changes to a Collaboration report that I created or collaborated on."
      />
      <NotificationsRow
        id="WhenCollaborationReportApproved"
        label="A manager approves a Collaboration report that I created or collaborated on."
      />
      <NotificationsRow
        id="WhenAddedAsCollaborationCollaborator"
        label="I'm added as a collaborator on a Collaboration report."
      />
    </div>
  );
}
