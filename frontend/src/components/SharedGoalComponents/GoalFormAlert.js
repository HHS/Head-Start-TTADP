import React from 'react';
import PropTypes from 'prop-types';

export default function GoalFormAlert({ alert }) {
  if (!alert) {
    return null;
  }

  return (
    <div className={`usa-alert usa-alert--${alert.type || 'warning'} margin-top-2`} data-testid="alert">
      <div className="usa-alert__body">
        {alert.message}
      </div>
    </div>

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
