import React from 'react';
import NotificationsSection from './NotificationsSection';
/**
 * Note that none of these are implemented yet here and mocked out only for UI verification
 * @returns
 */
export default function OtherNotifications({
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
          id: 'WhenMonitoringDetailsAdded',
          label:
            "New monitoring details are added for recipients in my region where I'm the TTAC or Manager.",
        },
        {
          id: 'WhenAddedAsCoOwner',
          label: "I'm added as a Co-owner of a “My group”.",
          hideInApp: true,
        },
        {
          id: 'WhenSharedMyGroup',
          label: 'Someone shares their “My group” with me.',
        },
      ]}
    />
  );
}
