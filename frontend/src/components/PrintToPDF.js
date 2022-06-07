import React from 'react';
import PropTypes from 'prop-types';

export default function PrintToPdf({ disabled, className }) {
  const classes = `usa-button no-print ${className}`;
  return <button type="button" className={classes} disabled={disabled} onClick={() => window.print()}>Print to PDF</button>;
}

PrintToPdf.propTypes = {
  disabled: PropTypes.bool,
  className: PropTypes.string,
};

PrintToPdf.defaultProps = {
  disabled: false,
  className: '',
};
