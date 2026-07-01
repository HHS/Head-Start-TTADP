import React from 'react';
import NotificationsSection from './NotificationsSection';

export default function ActivityReportNotifications({
  emailVerified,
  sendVerificationEmail,
  emailVerificationSent,
  clearAlerts,
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
        name: 'ActivityReports',
        label: 'Set preferences for all Activity Report notifications',
        ids: [
          'WhenReportSubmittedForReview',
          'WhenChangeRequested',
          'WhenAppointedCollaborator',
          'WhenRecipientReportApprovedProgramSpecialist',
          'WhenReportApproval',
          'WhenCollaboratorReportSubmittedForReview',
          'WhenCreatorReportSubmittedForReview',
        ],
      }}
      items={[
        {
          id: 'WhenReportSubmittedForReview',
          label: 'Someone submits an Activity Report for my approval.',
        },
        {
          id: 'WhenCollaboratorReportSubmittedForReview',
          label: 'Someone submits an Activity Report for approval that I am a collaborator on.',
        },
        {
          id: 'WhenCreatorReportSubmittedForReview',
          label: 'Someone submits an Activity Report for approval that I created.',
        },
        {
          id: 'WhenChangeRequested',
          label:
            'A manager requests changes to an activity report that I created or collaborated on.',
        },
        {
          id: 'WhenReportApproval',
          label: 'A manager approves an Activity Report that I created or collaborated on.',
        },
        {
          id: 'WhenAppointedCollaborator',
          label: "I'm added as a collaborator on an activity report.",
        },
        {
          id: 'WhenRecipientReportApprovedProgramSpecialist',
          label: (
            <>
              <em>Program specialists only:</em>
              <br /> One of my recipients&apos; activity reports is available.
            </>
          ),
        },
      ]}
    />
  );
}
