import { Alert } from '@trussworks/react-uswds';
import PropTypes from 'prop-types';
import React from 'react';

export default function GoalStatusChangeAlert({
  invalidStatusChangeAttempted,
  internalLeftMargin,
}) {
  if (!invalidStatusChangeAttempted) {
    return null;
  }

  return (
    <Alert type="info" className={`${internalLeftMargin} margin-bottom-2`}>
      <p className="usa-prose margin-0">
        The goal status cannot be changed until all In progress objectives are complete. Update the
        objective status.
      </p>
    </Alert>
  );
}

GoalStatusChangeAlert.propTypes = {
  internalLeftMargin: PropTypes.string.isRequired,
  invalidStatusChangeAttempted: PropTypes.bool,
};
GoalStatusChangeAlert.defaultProps = {
  invalidStatusChangeAttempted: false,
};
