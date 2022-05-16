import React from 'react';
import PropTypes from 'prop-types';
import './StatusDropdown.css';
import {
  InProgress,
  Closed,
  NoStatus,
  NotStarted,
  Draft,
  Ceased,
} from './icons';
import colors from '../../colors';

const STATUSES = {
  'In Progress': {
    display: 'In progress',
    color: colors.ttahubMediumBlue,
    icon: <InProgress />,
  },
  Completed: {
    display: 'Closed',
    color: colors.success,
    icon: <Closed />,
  },
  Draft: {
    display: 'Draft',
    color: colors.ttahubBlue,
    icon: <Draft />,
  },
  'Not Started': {
    display: 'Not started',
    color: colors.warning,
    icon: <NotStarted />,
  },
  'Ceased/Suspended': {
    display: 'Suspended',
    color: colors.errorDark,
    icon: <Ceased />,
  },
  'Needs Status': {
    display: 'Needs status',
    color: colors.baseLighter,
    icon: <NoStatus />,
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
      <select className="usa-select margin-0 padding-0" id={`statusSelect-${goalId}`} onChange={onChange} value={key}>
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
