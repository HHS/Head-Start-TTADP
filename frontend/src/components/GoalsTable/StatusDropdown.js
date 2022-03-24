/* eslint-disable no-unused-vars */
import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faClock,
  faCheckCircle,
  faExclamationCircle,
  faPencilAlt,
  faMinusCircle,
  faTimesCircle,
} from '@fortawesome/free-solid-svg-icons';

const STATUSES = {
  'In Progress': {
    display: 'In progress',
    color: '#0166ab',
    icon: <FontAwesomeIcon className="margin-right-1" size="1x" color="#0166ab" icon={faClock} />,
  },
  Completed: {
    display: 'Closed',
    color: '#148439',
    icon: <FontAwesomeIcon className="margin-right-1" size="1x" color="#148439" icon={faCheckCircle} />,
  },
  Draft: {
    display: 'Draft',
    color: '#475260',
    icon: <FontAwesomeIcon className="margin-right-1" size="1x" color="#475260" icon={faPencilAlt} />,
  },
  'Not Started': {
    display: 'Not started',
    color: '#e2a04d',
    icon: <FontAwesomeIcon className="margin-right-1" size="1x" color="#e2a04d" icon={faMinusCircle} />,
  },
  'Ceased/Suspended': {
    display: 'Suspended',
    color: '#b50908',
    icon: <FontAwesomeIcon className="margin-right-1" size="1x" color="#b50908" icon={faTimesCircle} />,
  },
  'Needs Status': {
    display: 'Needs status',
    color: '#c5c5c5',
    icon: <FontAwesomeIcon className="margin-right-1" size="1x" color="#c5c5c5" icon={faExclamationCircle} />,
  },
};

export default function StatusDropdown({ status, onUpdateGoalStatus }) {
  const key = status || 'Needs Status';
  const { icon, display } = STATUSES[key];

  return (
    <>
      {icon}
      {display}
    </>
  );
}

StatusDropdown.propTypes = {
  onUpdateGoalStatus: PropTypes.func.isRequired,
  status: PropTypes.string,
};

StatusDropdown.defaultProps = {
  status: '',
};
