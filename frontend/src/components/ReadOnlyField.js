import React from 'react';
import PropTypes from 'prop-types';

export default function ReadOnlyField({ label, children }) {
  return (
    <>
      <p className="usa-prose margin-bottom-0 text-bold">{label}</p>
      <p className="usa-prose margin-top-0">{children}</p>
    </>
  );
}

ReadOnlyField.propTypes = {
  label: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
};
