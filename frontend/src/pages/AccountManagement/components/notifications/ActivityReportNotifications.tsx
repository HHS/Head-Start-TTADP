import React, { useContext } from 'react';
import RolesOnly, { userHasRole } from '../../../../components/RolesOnly';
import UserContext from '../../../../UserContext';
import NotificationsSection from './NotificationsSection';

const PROGRAM_SPECIALIST_ROLES = ['PS', 'SPS', 'GMS'];
const PROGRAM_SPECIALIST_NOTIFICATION_ID = 'WhenRecipientReportApprovedProgramSpecialist';

function ProgramSpecialistsOnly({ children }: { children: React.ReactNode }) {
  return <RolesOnly roles={PROGRAM_SPECIALIST_ROLES}>{children}</RolesOnly>;
}

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
  const { user } = (useContext(UserContext) || {}) as { user?: { roles?: { name: string }[] } };
  const isProgramSpecialist = userHasRole(user, PROGRAM_SPECIALIST_ROLES);

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
          // the group control should not change a setting the user cannot see
          ...(isProgramSpecialist ? [PROGRAM_SPECIALIST_NOTIFICATION_ID] : []),
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
            'A manager requests changes to an Activity Report that I created, collaborated on, or am assigned to approve.',
        },
        {
          id: 'WhenReportApproval',
          label:
            'A manager approves an Activity Report that I created, collaborated on, or am assigned to approve.',
        },
        {
          id: 'WhenAppointedCollaborator',
          label: "I'm added as a collaborator on an activity report.",
        },
        {
          id: PROGRAM_SPECIALIST_NOTIFICATION_ID,
          label: "One of my recipients' activity reports is available.",
          wrapper: ProgramSpecialistsOnly,
        },
      ]}
    />
  );
}
