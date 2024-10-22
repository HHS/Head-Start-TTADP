import React from 'react';
import PropTypes from 'prop-types';
import { Alert } from '@trussworks/react-uswds';

export default function GoalFormAlert({ alert }) {
  if (!alert) {
    return null;
  }
  return (
    <Alert type={alert.type || 'warning'} className="margin-top-2">
      {alert.message}
    </Alert>
  );
}

GoalFormAlert.propTypes = {
  alert: PropTypes.shape({
    message: PropTypes.string,
    type: PropTypes.string,
  }),
};

GoalFormAlert.defaultProps = {
  alert: null,
};
