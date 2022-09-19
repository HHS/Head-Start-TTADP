import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBan } from '@fortawesome/free-solid-svg-icons';
import colors from '../../colors';
import './UnusedData.scss';

export default function UnusedData({ key, value }) {
  return (
    <li key={key} className="ttahub-objective-list-item--unused-data">
      <FontAwesomeIcon icon={faBan} color={colors.baseDark} className="padding-right-1" />
      {value}
    </li>
  );
}

UnusedData.propTypes = {
  key: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
};
