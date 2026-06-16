import React from 'react';
import NotificationsSection from './NotificationsSection';
/**
 * Note that none of these are implemented yet here and mocked out only for UI verification
 * @returns
 */
export default function CommunicationLogNotifications({
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
        name: 'CommunicationLogs',
        label: 'Set preferences for all Communication Log notifications',
        ids: ['WhenAddedAsTTAStaffCommLog', 'WhenAddedAsRecipientCommLog'],
      }}
      items={[
        {
          id: 'WhenAddedAsTTAStaffCommLog',
          label: "I'm added as TTA staff on a Communication Log.",
        },
        {
          id: 'WhenAddedAsRecipientCommLog',
          label: 'A Communication Log was entered for a recipient in one of “My groups”.',
        },
      ]}
    />
  );
}
