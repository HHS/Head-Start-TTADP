import React from 'react';
import PropTypes from 'prop-types';

export default function Req({ className, doNotRead }) {
  return <span className={`smart-hub--form-required font-family-sans font-ui-xs ${className}`} aria-label="Required" aria-hidden={doNotRead}>*</span>;
}

Req.propTypes = {
  className: PropTypes.string,
  doNotRead: PropTypes.bool,
};

Req.defaultProps = {
  className: '',
  doNotRead: false,
};
