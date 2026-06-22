import PropTypes from 'prop-types';
import React from 'react';
import Tabs from '../../../components/Tabs';

export default function NotificationTabs() {
  return (
    <Tabs
      ariaLabel="Notifications navigation"
      exact
      prefix="notifications"
      tabs={[
        { key: 'Active', value: '' },
        { key: 'Archived', value: 'archive' },
      ]}
    />
  );
}

NotificationTabs.propTypes = {
  isArchive: PropTypes.bool.isRequired,
};
