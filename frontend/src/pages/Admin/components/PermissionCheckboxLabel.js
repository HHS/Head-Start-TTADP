import PropTypes from 'prop-types';
import React from 'react';

function PermissionCheckboxLabel({ name, description }) {
  return (
    <>
      <strong>{name}</strong>
      {': '}
      {description}
    </>
  );
}

PermissionCheckboxLabel.propTypes = {
  name: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
};

export default PermissionCheckboxLabel;
