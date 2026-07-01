import { Alert } from '@trussworks/react-uswds';
import React from 'react';
import { Link } from 'react-router-dom';
import NotificationCard from './NotificationCard';

interface NotificationListProps {
  notifications: Array<{
    createdAt: string;
    actionable: boolean;
    archivedAt?: string;
    displayId?: string;
    id: number | string;
    label?: string;
    link?: string;
    text?: string;
    type?: string;
    viewedAt?: string;
  }>;
  error?: string;
  isArchive?: boolean;
  onArchive: (notificationId: number | string) => void;
}

export default function NotificationList({
  notifications,
  error,
  isArchive,
  onArchive,
}: NotificationListProps): React.ReactElement {
  if (error) {
    return (
      <Alert slim type="error" headingLevel="h3" className="margin-bottom-2">
        Error loading notifications
      </Alert>
    );
  }

  if (!notifications.length) {
    return (
      <div className="text-center padding-10">
        <h2 className="font-serif-md text-center">You're all caught up!</h2>
        <p className="usa-prose text-center bold">
          You don't have any {isArchive ? 'archived' : 'new'} notifications.
        </p>
        <Link className="usa-button display-inline-block margin-auto" to="/account/notifications">
          Set notification preferences
        </Link>
      </div>
    );
  }

  return (
    <ul className="usa-list--unstyled margin-y-3 margin-x-2">
      {notifications.map((notification) => (
        <NotificationCard key={notification.id} notification={notification} onArchive={onArchive} />
      ))}
    </ul>
  );
}
