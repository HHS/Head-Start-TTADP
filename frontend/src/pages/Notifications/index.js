import { Dropdown } from '@trussworks/react-uswds';
import React from 'react';
import { Link } from 'react-router-dom';
import Container from '../../components/Container';
// biome-ignore lint/correctness/noUnusedImports: Importing for future use
import { fetchArchivedNotifications, fetchNotifications } from '../../fetchers/notifications';
import useFetch from '../../hooks/useFetch';

// biome-ignore lint/correctness/noUnusedVariables: SORT_OPTIONS is defined for future use in sorting notifications
const SORT_OPTIONS = [
  {
    key: 'action_needed-asc',
    label: 'Action needed (oldest first)', //default sort
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

export default function Notifications() {
  // FIGMA DESIGNS:
  // ACTIVE TAB: @https://www.figma.com/design/LNF1ux5pEABIOD10T2oBUP/Actionable-Notifications?node-id=1328-16115&m=dev
  // ARCHIVE TAB: @https://www.figma.com/design/LNF1ux5pEABIOD10T2oBUP/Actionable-Notifications?node-id=1801-23252&m=dev

  // TODO: use react router/URL to determine whether to show active or archived notifications
  // TODO: Use react router to update state

  // these are the notifications, we will add fetcher next, for now we are just testing the layout with dummy data
  // they will be fetched by either archived or active notifications endpoint, depending on the tab
  const { data } = useFetch([], async () => {}, []);

  return (
    <>
      <h1 className="landing margin-0">Notifications</h1>
      {/* TODO: Add filter component, not included in initial implementation, despite being in Figma designs */}
      <Container className="margin-top-4">
        {/* Sort options, dropdown */}
        <Dropdown></Dropdown>
        <Link to="/notifications/preferences">Set notifications preferences</Link>

        {/* two tabs, active and archive */}
        {/* they link to /notifications and /notifications/archive, respectively */}
      </Container>
    </>
  );
}
