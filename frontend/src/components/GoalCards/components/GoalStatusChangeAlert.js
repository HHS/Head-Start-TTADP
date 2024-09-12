import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { Alert } from '@trussworks/react-uswds';

export default function GoalStatusChangeAlert({
  invalidStatusChangeAttempted,
  editLink,
  internalLeftMargin,
}) {
  if (!invalidStatusChangeAttempted) {
    return null;
  }

  return (
    <Alert
      type="info"
      className={`${internalLeftMargin} margin-bottom-2`}
    >
      <p className="usa-prose margin-0">
        The goal status cannot be changed until
        {' '}
        all In progress objectives are complete or suspended.
        {' '}
        <Link to={editLink}>Update the objective status</Link>
        .
      </p>
    </Alert>
  );
}

GoalStatusChangeAlert.propTypes = {
  editLink: PropTypes.string.isRequired,
  internalLeftMargin: PropTypes.string.isRequired,
  invalidStatusChangeAttempted: PropTypes.bool.isRequired,
};
