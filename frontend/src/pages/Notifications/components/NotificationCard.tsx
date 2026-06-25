import { faX } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Button } from '@trussworks/react-uswds';
import moment from 'moment';
import React from 'react';
import { Link } from 'react-router-dom';
import colors from '../../../colors';
import './NotificationCard.css';
import { viewNotification } from '../../../fetchers/notifications';

export default function NotificationCard({
  notification,
  onArchive,
}: {
  onArchive: (notificationId: number | string) => void;
  notification: {
    archivedAt?: string;
    createdAt: string;
    displayId?: string;
    id: number | string;
    label?: string;
    link?: string;
    text?: string;
    type?: string;
    viewedAt?: string;
    actionable: boolean;
  };
}): React.ReactElement {
  const isUnread = !notification.viewedAt;

  const linkClass = `usa-button ${notification.actionable ? '' : 'usa-button--outline'}`;

  return (
    <li className="notification-card height-9 padding-x-2 border-base-lighter border radius-lg display-flex flex-justify-start flex-align-center padding-y-1 margin-y-1">
      {isUnread ? (
        <>
          <span
            aria-hidden="true"
            className="display-inline-block radius-pill bg-success-darkest ttahub-notification-indicator"
          />
          <span className="usa-sr-only">Unread notification</span>
        </>
      ) : (
        <span className="display-inline-block ttahub-notification-indicator" />
      )}
      <div>{moment(notification.createdAt).format('MM/DD/YYYY')}</div>
      <div className="notification-card__display-id width-15">{notification.displayId || ''}</div>
      <div className="notification-card__text text-left flex-1">{notification.text}</div>
      <div className="flex-justify-self-end">
        {notification.label && notification.link ? (
          <Link
            className={linkClass}
            to={notification.link}
            onClick={() => viewNotification(String(notification.id))}
          >
            {notification.label}
          </Link>
        ) : null}
      </div>
      <div>
        {!notification.actionable ? (
          <Button
            type="button"
            unstyled
            aria-label={`Dismiss ${notification.text}`}
            onClick={() => onArchive(notification.id)}
          >
            <FontAwesomeIcon icon={faX} size="1x" color={colors.textInk} />
          </Button>
        ) : null}
      </div>
    </li>
  );
}
