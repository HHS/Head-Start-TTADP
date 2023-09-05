import React from 'react';
import PropTypes from 'prop-types';

export default function GranteeStaffHistory({ regionId, recipientId }) {
  return (
    <h2>
      {regionId}
      ,
      {' '}
      {recipientId}
    </h2>
  );
}

GranteeStaffHistory.propTypes = {
  regionId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  recipientId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
};
