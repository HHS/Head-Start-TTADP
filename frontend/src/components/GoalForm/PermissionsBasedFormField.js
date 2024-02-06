import React from 'react';
import PropTypes from 'prop-types';

import ReadOnlyField from '../ReadOnlyField';

export default function PermissionsBasedFormField({
  permissions,
  label,
  value,
  children,
}) {
  const readOnly = !permissions.every((p) => Boolean(p));

  if (readOnly) {
    return (
      <ReadOnlyField
        label={label}
      >
        {value}
      </ReadOnlyField>
    );
  }

  return children;
}

PermissionsBasedFormField.propTypes = {
  permissions: PropTypes.arrayOf(PropTypes.bool).isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.node]).isRequired,
  children: PropTypes.node.isRequired,
};
