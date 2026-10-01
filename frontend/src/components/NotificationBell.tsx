import { faBell } from '@fortawesome/pro-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React from 'react';
import { Link } from 'react-router-dom';
import colors from '../colors';
import FeatureFlag from './FeatureFlag';
import './NotificationBell.css';

export default function NotificationBell({
  hasUnreadNotifications,
}: {
  hasUnreadNotifications: boolean;
}) {
  return (
    <FeatureFlag flag="actionable_notifications">
      <Link
        to="/notifications"
        aria-label={
          hasUnreadNotifications ? 'Notifications, unread notifications' : 'Notifications'
        }
      >
        <FontAwesomeIcon
          icon={faBell}
          color={colors.ttahubMediumBlue}
          className={`ttahub-header-indicator ${hasUnreadNotifications ? 'ttahub-notification-bell__with-unread' : ''}`}
        />
      </Link>
    </FeatureFlag>
  );
}
