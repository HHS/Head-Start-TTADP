import PropTypes from 'prop-types';
import React from 'react';
import GoalFormAlert from './GoalFormAlert';

export default function GoalFormError({ error }) {
  if (!error) {
    return null;
  }

  return (
    <GoalFormAlert
      alert={{
        message: error,
        type: 'error',
      }}
    />
  );
}

GoalFormError.propTypes = {
  error: PropTypes.string,
};

GoalFormError.defaultProps = {
  error: null,
};
