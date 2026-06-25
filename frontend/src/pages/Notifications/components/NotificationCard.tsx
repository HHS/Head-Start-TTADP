import { faX } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Button } from '@trussworks/react-uswds';
import type { Notification } from '@ttahub/types';
import moment from 'moment';
import React from 'react';
import { Link } from 'react-router-dom';
import colors from '../../../colors';
import { viewNotification } from '../../../fetchers/notifications';
import './NotificationCard.css';

function NotificationCardDismiss({
  notification,
  onArchive,
  isMobile,
}: {
  notification: Notification;
  onArchive: (notificationId: number | string) => void;
  isMobile?: boolean;
}): React.ReactElement {
  return (
    <div
      className={`notification-card__dismiss ${isMobile ? 'notification-card__dismiss-mobile' : ''}`}
    >
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
  );
}

export default function NotificationCard({
  notification,
  onArchive,
}: {
  onArchive: (notificationId: number | string) => void;
  notification: Notification;
}): React.ReactElement {
  const isUnread = !notification.viewedAt;

  const linkClass = `usa-button ${notification.actionable ? '' : 'usa-button--outline'}`;

  return (
    <li className="notification-card desktop:height-9 padding-x-2 border-base-lighter border radius-lg desktop:display-flex flex-justify-start flex-align-center padding-y-1 margin-y-1">
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
      <div className="notification-card__display-id desktop:width-15">
        {notification.displayId || ''}
      </div>
      <NotificationCardDismiss notification={notification} onArchive={onArchive} isMobile />
      <div className="notification-card__text text-left flex-1">{notification.text}</div>
      <div className="notification-card__link flex-justify-self-end">
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
      <NotificationCardDismiss notification={notification} onArchive={onArchive} />
    </li>
  );
}
