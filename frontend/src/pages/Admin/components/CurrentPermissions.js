import React from 'react';
import PropTypes from 'prop-types';

import { scopeFromId } from '../PermissionHelpers';

function CurrentPermissions({ regions, scope }) {
  const regionsStr = regions.length === 1 ? 'Region' : 'Regions';
  const regionMsg = `${regionsStr} ${regions.join(', ')}`;
  const { name } = scopeFromId(scope);
  return (
    <li>
      <strong>{name}</strong>
      {': '}
      {regionMsg}
    </li>
  );
}

CurrentPermissions.propTypes = {
  regions: PropTypes.arrayOf(PropTypes.string).isRequired,
  scope: PropTypes.string.isRequired,
};

export default CurrentPermissions;
