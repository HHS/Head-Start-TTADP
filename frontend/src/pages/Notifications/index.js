import React, { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Container from '../../components/Container';
import { fetchArchivedNotifications, fetchNotifications } from '../../fetchers/notifications';
import useFetch from '../../hooks/useFetch';
import NotificationList from './components/NotificationList';
import NotificationSort from './components/NotificationSort';
import NotificationTabs from './components/NotificationTabs';

export const SORT_OPTIONS = [
  {
    key: 'action_needed-asc',
    label: 'Action needed (oldest first)',
  },
  {
    key: 'action_needed-desc',
    label: 'Action needed (newest first)',
  },
  {
    label: 'Informational (oldest first)',
    key: 'informational-asc',
  },
  {
    label: 'Informational (newest first)',
    key: 'informational-desc',
  },
  {
    label: 'Notification type (A-Z)',
    key: 'type-asc',
  },
  {
    label: 'Notification type (Z-A)',
    key: 'type-desc',
  },
  {
    label: 'All (oldest first)',
    key: 'all-asc',
  },
  {
    label: 'All (newest first)',
    key: 'all-desc',
  },
];

const DEFAULT_SORT_KEY = 'action_needed-asc';

const SORT_KEY_TO_CONFIG = {
  'action_needed-asc': { sortBy: 'triggeredAt', direction: 'ASC' },
  'action_needed-desc': { sortBy: 'triggeredAt', direction: 'DESC' },
  'informational-asc': { sortBy: 'createdAt', direction: 'ASC' },
  'informational-desc': { sortBy: 'createdAt', direction: 'DESC' },
  'type-asc': { sortBy: 'updatedAt', direction: 'ASC' },
  'type-desc': { sortBy: 'updatedAt', direction: 'DESC' },
  'all-asc': { sortBy: 'triggeredAt', direction: 'ASC' },
  'all-desc': { sortBy: 'triggeredAt', direction: 'DESC' },
};

const SORT_CONFIG_TO_KEY = Object.entries(SORT_KEY_TO_CONFIG).reduce((acc, [key, config]) => {
  acc[`${config.sortBy}-${config.direction}`] = key;
  return acc;
}, {});

export default function Notifications() {
  const location = useLocation();
  const isArchive = useMemo(
    () => location.pathname === '/notifications/archive',
    [location.pathname]
  );

  const { currentSortKey, sortConfig } = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const fallbackConfig = SORT_KEY_TO_CONFIG[DEFAULT_SORT_KEY];
    const sortBy = params.get('sortBy') || fallbackConfig.sortBy;
    const direction = params.get('direction') || params.get('sortDir') || fallbackConfig.direction;
    const configKey = `${sortBy}-${direction}`;

    return {
      currentSortKey: SORT_CONFIG_TO_KEY[configKey] || DEFAULT_SORT_KEY,
      sortConfig: {
        sortBy,
        direction,
      },
    };
  }, [location.search]);

  const fetcher = isArchive
    ? () => fetchArchivedNotifications({ sortConfig })
    : () => fetchNotifications({ sortConfig });

  const { data, error } = useFetch([], fetcher, [isArchive, sortConfig]);

  const handleSortChange = () => undefined;

  return (
    <>
      <h1 className="landing margin-0">Notifications</h1>

      <Container className="notifications-container margin-top-4" paddingX={0}>
        <div className="padding-x-3">
          <NotificationSort
            onChange={handleSortChange}
            options={SORT_OPTIONS}
            value={currentSortKey}
          />
          <Link className="margin-bottom-3 display-block" to="/notifications/preferences">
            Set notifications preferences
          </Link>
        </div>
        <NotificationTabs isArchive={isArchive} />
        <NotificationList error={error} isArchive={isArchive} notifications={data} />
      </Container>
    </>
  );
}
