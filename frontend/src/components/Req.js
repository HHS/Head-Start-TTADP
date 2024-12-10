/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import PropTypes from 'prop-types';

export default function Req({ className, announce }) {
  const aria = announce ? { 'aria-label': 'required' } : { 'aria-hidden': true };
  return (
    <span className={`smart-hub--form-required font-family-sans font-ui-xs margin-right-1 ${className}`} {...aria}>
      {' '}
      *
    </span>
  );
}

Req.propTypes = {
  className: PropTypes.string,
  announce: PropTypes.bool,
};

Req.defaultProps = {
  className: '',
  announce: false,
};
