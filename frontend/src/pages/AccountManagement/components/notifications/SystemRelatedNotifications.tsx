import React from 'react';
import NotificationsSection from './NotificationsSection';
/**
 * Note that none of these are implemented yet here and mocked out only for UI verification
 * @returns
 */
export default function SystemRelatedNotifications({
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
      items={[
        {
          id: 'WhenPlannedOutage',
          label: 'Planned system outage alerts.',
        },
        {
          id: 'WhenUnplannedOutage',
          label: 'Unplanned system outage alerts.',
          hideInApp: true,
        },
      ]}
    />
  );
}
