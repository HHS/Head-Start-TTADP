import React from 'react';

import NotificationsSection from './NotificationsSection';
/**
 * Note that none of these are implemented yet here and mocked out only for UI verification
 * @returns
 */
export default function TrainingReportNotifications({
  emailVerified,
  sendVerificationEmail,
  emailVerificationSent,
}: {
  emailVerified: boolean;
  sendVerificationEmail: () => void;
  emailVerificationSent: boolean;
}) {
  return (
    <NotificationsSection
      emailVerified={emailVerified}
      sendVerificationEmail={sendVerificationEmail}
      emailVerificationSent={emailVerificationSent}
      groupController={{
        name: 'TrainingReports',
        label: 'Set preferences for all Training Report notifications',
        ids: [
          'WhenAddedAsPocTrainingReport',
          'WhenAddedAsCollaboratorTrainingReport',
          'WhenSessionReviewRequestedTrainingReport',
          'WhenSessionChangesRequestedTrainingReport',
          'WhenSessionDetails20DaysCreatorCollaborator',
          'WhenSessionDetails20DaysPoc',
          'WhenNoSessionsCreatorCollaborator',
          'WhenEventDetails20DaysCreatorCollaborator',
          'WhenEventNotCompleted',
        ],
      }}
      items={[
        {
          id: 'WhenAddedAsPocTrainingReport',
          label: "I'm added as a Regional point of contact on a Training Report.",
        },
        {
          id: 'WhenAddedAsCollaboratorTrainingReport',
          label: "I'm added as a collaborator on a Training Report.",
        },
        {
          id: 'WhenSessionReviewRequestedTrainingReport',
          label: 'Someone submits an event session for my review.',
        },
        {
          id: 'WhenSessionChangesRequestedTrainingReport',
          label:
            'A manager requests changes to an event session that I created or collaborated on.',
        },
        {
          id: 'WhenEventDetails20DaysCreatorCollaborator',
          label:
            "Event details are not completed within 20 days of the event start date where I'm the Creator or Collaborator.",
        },
        {
          id: 'WhenSessionDetails20DaysCreatorCollaborator',
          label:
            "Session details are not completed within 20 days of the session start date where I'm the Creator or Collaborator.",
        },
        {
          id: 'WhenSessionDetails20DaysPoc',
          label:
            "Session details are not completed within 20 days of the session start date where I'm the Regional point of contact.",
        },
        {
          id: 'WhenNoSessionsCreatorCollaborator',
          label:
            "No sessions have been created within 20 days of the event end date where I'm the Event Creator or Collaborator.",
        },
        {
          id: 'WhenEventNotCompleted',
          label: 'Event creator has not completed event within 20 days of event end date.',
        },
      ]}
    />
  );
}
