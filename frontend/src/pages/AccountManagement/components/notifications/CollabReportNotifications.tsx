import React from 'react';
import NotificationsSection from './NotificationsSection';
/**
 * Note that none of these are implemented yet here and mocked out only for UI verification
 * @returns
 */
export default function CollabReportNotifications({
  emailVerified,
  sendVerificationEmail,
  emailVerificationSent,
  clearAlerts = false,
}: {
  emailVerified: boolean;
  sendVerificationEmail: () => void;
  emailVerificationSent: boolean;
  clearAlerts?: boolean;
}) {
  return (
    <NotificationsSection
      emailVerified={emailVerified}
      sendVerificationEmail={sendVerificationEmail}
      emailVerificationSent={emailVerificationSent}
      clearAlerts={clearAlerts}
      groupController={{
        name: 'CollabReports',
        label: 'Set preferences for all Collaboration Report notifications',
        ids: [
          'WhenCollabReportSubmittedForReview',
          'WhenCollaborationReportSubmittedForReview',
          'WhenCreatorCollaborationReportCollaboratorSubmittedForReview',
          'WhenCollaborationChangeRequested',
          'WhenCollaborationReportApproved',
          'WhenAddedAsCollaborationCollaborator',
        ],
      }}
      items={[
        {
          id: 'WhenCollabReportSubmittedForReview',
          label: 'Someone submits a Collaboration Report for my approval.',
        },
        {
          id: 'WhenCollaborationReportSubmittedForReview',
          label:
            'A Creator submits a Collaboration Report for approval that I am a Collaborator on.',
        },
        {
          id: 'WhenCreatorCollaborationReportCollaboratorSubmittedForReview',
          label: 'A Collaborator submits an Collaboration Report for approval that I created.',
        },
        {
          id: 'WhenCollaborationChangeRequested',
          label:
            'A manager requests changes to a Collaboration report that I created or collaborated on.',
        },
        {
          id: 'WhenCollaborationReportApproved',
          label: 'A manager approves a Collaboration report that I created or collaborated on.',
        },
        {
          id: 'WhenAddedAsCollaborationCollaborator',
          label: "I'm added as a collaborator on a Collaboration report.",
        },
      ]}
    />
  );
}
