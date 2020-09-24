import React from 'react';
import PropTypes from 'prop-types';

function CurrentPermissions({ regions, scope }) {
  const regionsStr = regions.length === 1 ? 'Region' : 'Regions';
  const regionMsg = `${regionsStr} ${regions.join(', ')}`;
  return (
    <li>
      <strong>{scope}</strong>
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
