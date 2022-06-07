import React from 'react';
import PropTypes from 'prop-types';

export default function PrintToPdf({ disabled }) {
  return <button type="button" className="usa-button no-print" disabled={disabled} onClick={() => window.print()}>Print to PDF</button>;
}

PrintToPdf.propTypes = {
  disabled: PropTypes.bool,
};

PrintToPdf.defaultProps = {
  disabled: false,
};
