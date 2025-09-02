import React from 'react';
import PropTypes from 'prop-types';

export default function PrintToPdf({ disabled, className, id }) {
  const classes = `usa-button no-print ${className}`;
  return <button type="button" id={id} className={classes} disabled={disabled} onClick={() => window.print()}>Print to PDF</button>;
}

PrintToPdf.propTypes = {
  disabled: PropTypes.bool,
  className: PropTypes.string,
  id: PropTypes.string.isRequired,
};

PrintToPdf.defaultProps = {
  disabled: false,
  className: '',
};
