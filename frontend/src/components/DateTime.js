import React from 'react';
import PropTypes from 'prop-types';
import './DateTime.css';

export default function DateTime(props) {
  const { classNames, timestamp, label } = props;
  return <time className={`ttahub---datetime ${classNames}`} dateTime={timestamp}>{label}</time>;
}

DateTime.propTypes = {
  classNames: PropTypes.string,
  label: PropTypes.string.isRequired,
  timestamp: PropTypes.string.isRequired,
};

DateTime.defaultProps = {
  classNames: '',
};
