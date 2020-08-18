import React from 'react';
import PropTypes from 'prop-types';

function Alert({ heading, body }) {
  return (
    <div className="usa-alert usa-alert--info">
      <div className="usa-alert__body">
        <h3 className="usa-alert__heading">{ heading }</h3>
        { body }
      </div>
    </div>
  );
}

Alert.propTypes = {
  heading: PropTypes.string.isRequired,
  body: PropTypes.string.isRequired,
};

export default Alert;
