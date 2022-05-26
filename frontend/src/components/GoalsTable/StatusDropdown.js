import React, { useContext } from 'react';
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
import UserContext from '../../UserContext';
import { canChangeGoalStatus } from '../../permissions';
import { DECIMAL_BASE } from '../../Constants';

const STATUSES = {
  'In Progress': {
    display: 'In progress',
    color: colors.ttahubMediumBlue,
    icon: <InProgress />,
  },
  Closed: {
    display: 'Closed',
    color: colors.success,
    icon: <Closed />,
  },
  // my database has "completed" goals in it, not sure why so leaving it in case of breakage
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
  goalId,
  status,
  onUpdateGoalStatus,
  previousStatus,
  regionId,
}) {
  const { user } = useContext(UserContext);
  const key = status || 'Needs Status';
  const { icon, display } = STATUSES[key];

  const isReadOnly = (status === 'Draft' || status === 'Completed' || status === 'Closed') || !canChangeGoalStatus(user, parseInt(regionId, DECIMAL_BASE));

  if (isReadOnly) {
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
        <option value="Closed">Closed</option>
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
  regionId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
};

StatusDropdown.defaultProps = {
  status: '',
  previousStatus: null,
};
