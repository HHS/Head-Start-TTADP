import { Dropdown, Pagination } from '@trussworks/react-uswds';
import React, { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Container from '../../components/Container';
import PaginationCard from '../../components/PaginationCard';
import { fetchArchivedNotifications, fetchNotifications } from '../../fetchers/notifications';
import useFetch from '../../hooks/useFetch';
import useSessionSort from '../../hooks/useSessionSort';
import NotificationList from './components/NotificationList';
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

export default function Notifications() {
  const location = useLocation();
  const isArchive = useMemo(
    () => location.pathname === '/notifications/archive',
    [location.pathname]
  );

  const [sortConfig, setSortConfig] = useSessionSort(
    {
      sortBy: 'action_needed',
      direction: 'ASC',
    },
    'notifications_fyp'
  );

  const fetcher = isArchive
    ? async () => fetchArchivedNotifications({ sortConfig })
    : async () => fetchNotifications({ sortConfig });

  const { data, error } = useFetch([], fetcher, [isArchive, sortConfig]);

  const handleSortChange = (ev) => {
    const newSortValue = ev.target.value || DEFAULT_SORT_KEY;
    const [sortBy, direction] = newSortValue.split('-');
    setSortConfig({ sortBy, direction: direction });
  };

  return (
    <>
      <h1 className="landing margin-0">Notifications</h1>

      <Container className="notifications-container margin-top-4" paddingX={0}>
        <div className="padding-x-3">
          <div className="display-flex flex-align-center margin-bottom-3">
            <label className="margin-right-1 text-no-wrap" htmlFor="notifications-sort">
              Sort by
            </label>
            <Dropdown
              className="margin-top-0 width-card-lg"
              id="notifications-sort"
              name="notifications-sort"
              onChange={handleSortChange}
              value={`${sortConfig.sortBy}-${sortConfig.direction}`}
            >
              {SORT_OPTIONS.map(({ key, label }) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </Dropdown>
          </div>
          <Link className="margin-bottom-3 display-block" to="/notifications/preferences">
            Set notifications preferences
          </Link>
        </div>
        <NotificationTabs isArchive={isArchive} />
        <NotificationList error={error} isArchive={isArchive} notifications={data} />

        <div class="padding-x-3">
          <PaginationCard />
        </div>
      </Container>
    </>
  );
}
