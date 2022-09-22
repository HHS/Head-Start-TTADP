import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBan } from '@fortawesome/free-solid-svg-icons';
import colors from '../../colors';
import './UnusedData.scss';

export default function UnusedData({ value, isLink }) {
  return (
    <li className="ttahub-objective-list-item--unused-data">
      <FontAwesomeIcon icon={faBan} color={colors.baseDark} className="padding-right-1" />
      {isLink ? <a href={value}>{value}</a> : value}
    </li>
  );
}

UnusedData.propTypes = {
  value: PropTypes.string.isRequired,
  isLink: PropTypes.bool,
};

UnusedData.defaultProps = {
  isLink: false,
};
