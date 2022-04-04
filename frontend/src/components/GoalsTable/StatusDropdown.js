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
import './StatusDropdown.css';

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

export default function StatusDropdown({
  goalId, status, onUpdateGoalStatus, previousStatus,
}) {
  const key = status || 'Needs Status';
  const { icon, display } = STATUSES[key];

  if (status === 'Draft' || status === 'Completed') {
    return (
      <>
        {icon}
        {display}
      </>
    );
  }

  const onChange = (e) => {
    onUpdateGoalStatus(e.target.value);
  };

  const getOptions = () => {
    // if the goal is ceased and has no "status suspended from" in the db you can only close it
    // otherwise, if it is ceased and has a status suspended from, you get that as an
    // additional option
    if (status === 'Ceased/Suspended') {
      if (!STATUSES[previousStatus]) {
        return (
          <option value="Completed">Closed</option>
        );
      }

      const statusSuspendedFromDisplay = STATUSES[previousStatus].display;
      return (
        <>
          <option value={previousStatus}>{statusSuspendedFromDisplay}</option>
          <option value="Completed">Closed</option>
        </>
      );
    }

    return (
      <>
        { !status && <option value="" disabled>Needs status</option> }
        { status !== 'In Progress' && <option value="Not Started">Not started</option> }
        <option value="In Progress">In progress</option>
        <option value="Completed">Closed</option>
        <option value="Ceased/Suspended">Suspended</option>
      </>
    );
  };

  const options = getOptions();

  return (
    <div className="ttahub-status-select position-relative">
      <label className="usa-button usa-button--unstyled" htmlFor={`statusSelect-${goalId}`} aria-label={`Change status for goal ${goalId}`}>
        {icon}
        {display}
      </label>
      <select className="usa-select margin-0 padding-0" id={`statusSelect-${goalId}`} onChange={onChange} value={status}>
        { options }
      </select>
    </div>
  );
}

StatusDropdown.propTypes = {
  goalId: PropTypes.number.isRequired,
  onUpdateGoalStatus: PropTypes.func.isRequired,
  status: PropTypes.string,
  previousStatus: PropTypes.string,
};

StatusDropdown.defaultProps = {
  status: '',
  previousStatus: null,
};
