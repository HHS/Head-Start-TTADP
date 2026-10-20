import PropTypes from 'prop-types';
import React from 'react';

const GrantLabel = ({ label, value }) => (
  <div>
    <span className="text-bold">{label}: </span>
    {value}
  </div>
);

GrantLabel.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
};

export default GrantLabel;
