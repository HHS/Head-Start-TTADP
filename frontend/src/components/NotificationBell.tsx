import { faBell } from '@fortawesome/pro-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, { useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { IS } from '../Constants';
import colors from '../colors';
import { fetchNotificationsCount } from '../fetchers/notifications';
import useDataUpdates from '../hooks/useDataUpdates';
import useFetch from '../hooks/useFetch';
import UserContext from '../UserContext';
import FeatureFlag from './FeatureFlag';
import './NotificationBell.css';

const FILTERS = [
  { topic: 'viewed', condition: IS, query: 'false' },
  { topic: 'archived', condition: IS, query: 'false' },
];

function Bell() {
  const { user } = useContext(UserContext);
  const location = useLocation();
  const revision = useDataUpdates('notifications');
  const { data } = useFetch({ count: 0, rows: [] }, () => fetchNotificationsCount(FILTERS), [
    user.id,
    location,
    revision,
  ]);
  const hasNotifications = data.count > 0;

  return (
    <Link
      to="/notifications"
      aria-label={hasNotifications ? 'Notifications, unread notifications' : 'Notifications'}
    >
      <FontAwesomeIcon
        icon={faBell}
        color={colors.ttahubMediumBlue}
        className={`ttahub-header-indicator ${hasNotifications ? 'ttahub-notification-bell__with-unread' : ''}`}
      />
    </Link>
  );
}

export default function NotificationBell() {
  const { user } = useContext(UserContext);
  return (
    <FeatureFlag flag="actionable_notifications">
      <Bell key={user.id} />
    </FeatureFlag>
  );
}
