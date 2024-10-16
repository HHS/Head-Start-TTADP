import React from 'react';
import PropTypes from 'prop-types';

export default function ReadOnlyField({ label, children }) {
  if (!children || !label) {
    return null;
  }

  return (
    <>
      <p className="usa-prose margin-bottom-0 text-bold" data-testid="read-only-label">{label}</p>
      <p className="usa-prose margin-top-0">{children}</p>
    </>
  );
}

ReadOnlyField.propTypes = {
  label: PropTypes.string,
  children: PropTypes.node,
};

ReadOnlyField.defaultProps = {
  label: undefined,
  children: undefined,
};
