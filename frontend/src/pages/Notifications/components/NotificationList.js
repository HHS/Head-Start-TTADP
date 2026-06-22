import { Alert } from '@trussworks/react-uswds';
import PropTypes from 'prop-types';
import React from 'react';
import { Link } from 'react-router-dom';
import NotificationCard from './NotificationCard';

export default function NotificationList({ notifications, error, isArchive }) {
  if (error) {
    return (
      <Alert slim type="error">
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
        <NotificationCard key={notification.id} notification={notification} />
      ))}
    </ul>
  );
}

NotificationList.propTypes = {
  error: PropTypes.string,
  isArchive: PropTypes.bool,
  notifications: PropTypes.arrayOf(
    PropTypes.shape({
      archivedAt: PropTypes.string,
      displayId: PropTypes.string,
      id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
      label: PropTypes.string,
      link: PropTypes.string,
      text: PropTypes.string,
      type: PropTypes.string,
      viewedAt: PropTypes.string,
    })
  ),
};

NotificationList.defaultProps = {
  error: '',
  notifications: [],
  isArchive: false,
};
