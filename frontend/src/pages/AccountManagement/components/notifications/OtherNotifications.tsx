import React from 'react';
import RolesOnly from '../../../../components/RolesOnly';
import NotificationsSection from './NotificationsSection';
import FeatureFlag from '../../../../components/FeatureFlag';

// Monitoring report notifications only go to TTACs and managers (TTAHUB-6003)
export const MONITORING_NOTIFICATION_ROLES = ['TTAC', 'ECM', 'GSM'];

function MonitoringRolesOnly({ children }: { children: React.ReactNode }) {
  return <RolesOnly roles={MONITORING_NOTIFICATION_ROLES}>{children}</RolesOnly>;
}

function ActionableNotificationsFeatureFlagOnly({ children }: { children: React.ReactElement }) {
  return (
    <FeatureFlag flag="actionable_notifications">{children}</FeatureFlag>
  );
}

/**
 * The monitoring row is only shown to TTACs and managers. The group rows are not wired up
 * yet and are shown only for UI verification.
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
            "A new monitoring report is added for recipients in my region where I'm the TTAC or Manager.",
          wrapper: MonitoringRolesOnly,
        },
        {
          id: 'WhenAddedAsCoOwner',
          label: "I'm added as a Co-owner of a “My group”.",
          hideInApp: true,
          wrapper: ActionableNotificationsFeatureFlagOnly,
        },
        {
          id: 'WhenSharedMyGroup',
          label: 'Someone shares their “My group” with me.',
          wrapper: ActionableNotificationsFeatureFlagOnly,
        },
      ]}
    />
  );
}
