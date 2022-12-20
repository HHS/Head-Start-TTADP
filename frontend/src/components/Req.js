import React from 'react';
import PropTypes from 'prop-types';

export default function Req({ className }) {
  return <span className={`smart-hub--form-required font-family-sans font-ui-xs ${className}`} aria-label="Required">*</span>;
}

Req.propTypes = {
  className: PropTypes.string,
};

Req.defaultProps = {
  className: '',
};
