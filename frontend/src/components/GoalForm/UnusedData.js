import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBan } from '@fortawesome/free-solid-svg-icons';

export default function UnusedData({ key, value }) {
  return (
    <li key={key}>
      <FontAwesomeIcon icon={faBan} />
      {value}
    </li>
  );
}

UnusedData.propTypes = {
  key: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
};
