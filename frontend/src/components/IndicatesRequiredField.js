import React from 'react';
import PropTypes from 'prop-types';

export default function IndicatesRequiredField({ className }) {
  return (
    <p className={`usa-prose ${className}`}>
      <span className="smart-hub--form-required font-family-sans font-ui-xs">* </span>
      indicates required field
    </p>
  );
}

IndicatesRequiredField.propTypes = {
  className: PropTypes.string,
};

IndicatesRequiredField.defaultProps = {
  className: 'margin-top-0',
};
