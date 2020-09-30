import React from 'react';
import PropTypes from 'prop-types';

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
