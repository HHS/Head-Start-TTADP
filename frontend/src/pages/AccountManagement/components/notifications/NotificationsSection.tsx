import { Alert, Button } from '@trussworks/react-uswds';
import React, { useState } from 'react';
import NotificationsGroupController from './NotificationsGroupController';
import NotificationsRow from './NotificationsRow';

export default function NotificationsSection({
  emailVerified,
  sendVerificationEmail,
  emailVerificationSent,
  items,
  groupController = undefined,
}: {
  emailVerified: boolean;
  sendVerificationEmail: () => void;
  emailVerificationSent: boolean;
  groupController?: {
    label: string;
    ids: string[];
    name: string;
  };
  items: Array<{
    id: string;
    label: React.ReactNode;
    hideInApp?: boolean;
  }>;
}) {
  const [displayAlert, setDisplayAlert] = useState(false);

  return (
    <div>
      {displayAlert && (
        <Alert headingLevel="h3" type="error" className="margin-bottom-2">
          You must verify your email before setting email preferences or receiving email
          notifications.
          <Button onClick={sendVerificationEmail} type="button" unstyled>
            {emailVerificationSent ? 'Resend verification email' : 'Send verification email'}
          </Button>
        </Alert>
      )}

      <div className="display-flex flex-align-center">
        <div className="flex-1 text-bold">Event</div>
        <div className="text-bold width-10">In-app</div>
        <div className="text-bold width-card">Email</div>
      </div>
      {groupController && (
        <NotificationsGroupController
          groupName={groupController.name}
          ids={groupController.ids}
          label={groupController.label}
          emailVerified={emailVerified}
          setDisplayAlert={setDisplayAlert}
        />
      )}

      <hr />
      {items.map(({ id, label, hideInApp }) => (
        <NotificationsRow
          key={id}
          id={id}
          label={label}
          emailVerified={emailVerified}
          setDisplayAlert={setDisplayAlert}
          hideInApp={hideInApp}
        />
      ))}
    </div>
  );
}
