import React, { useContext, useMemo } from 'react';
import PropTypes from 'prop-types';
import { DECIMAL_BASE } from '@ttahub/common';
import UserContext from '../../../UserContext';
import { canChangeGoalStatus } from '../../../permissions';
import STATUSES from './StatusDropdownStatuses';
import StatusDropdown from './StatusDropdown';

export default function GoalStatusDropdown({
  goalId,
  status,
  onUpdateGoalStatus,
  previousStatus,
  regionId,
  showReadOnlyStatus,
  className,
}) {
  const { user } = useContext(UserContext);
  const key = status || 'Needs Status';
  const { icon, display } = STATUSES[key];

  const isReadOnly = useMemo(() => ((
    status === 'Draft'
    || status === 'Completed'
    || status === 'Closed')
    || !canChangeGoalStatus(user, parseInt(regionId, DECIMAL_BASE))
    || showReadOnlyStatus), [status, user, regionId, showReadOnlyStatus]);

  if (isReadOnly) {
    return (
      <div className={className}>
        {icon}
        {display}
      </div>
    );
  }

  const getOptions = () => {
    // if the goal is ceased and has no "status suspended from" in the db you can only close it
    // otherwise, if it is ceased and has a status suspended from, you get that as an
    // additional option
    if (status === 'Ceased/Suspended' || status === 'Suspended') {
      if (!STATUSES[previousStatus]) {
        return [
          {
            label: 'Closed',
            onClick: () => onUpdateGoalStatus('Closed'),
          },
        ];
      }

      const statusSuspendedFromDisplay = STATUSES[previousStatus].display;
      return [
        {
          label: statusSuspendedFromDisplay,
          onClick: () => onUpdateGoalStatus(previousStatus),
        },
        {
          label: 'Closed',
          onClick: () => onUpdateGoalStatus('Closed'),
        },
      ];
    }

    if (status === 'In Progress' || status === 'Not Started') {
      return [
        {
          label: 'Closed',
          onClick: () => onUpdateGoalStatus('Closed'),
        },
        {
          label: 'Suspended',
          onClick: () => onUpdateGoalStatus('Suspended'),
        },
      ];
    }

    return [
      {
        label: 'In progress',
        onClick: () => onUpdateGoalStatus('In Progress'),
      },
      {
        label: 'Closed',
        onClick: () => onUpdateGoalStatus('Closed'),
      },
      {
        label: 'Suspended',
        onClick: () => onUpdateGoalStatus('Suspended'),
      },
    ];
  };

  const options = getOptions();

  return (
    <StatusDropdown
      label={`Change status for goal ${goalId}`}
      options={options}
      className={className}
      icon={icon}
      display={display}
    />
  );
}

GoalStatusDropdown.propTypes = {
  goalId: PropTypes.number.isRequired,
  onUpdateGoalStatus: PropTypes.func.isRequired,
  status: PropTypes.string,
  previousStatus: PropTypes.string,
  regionId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  showReadOnlyStatus: PropTypes.bool,
  className: PropTypes.string,
};

GoalStatusDropdown.defaultProps = {
  status: '',
  previousStatus: null,
  showReadOnlyStatus: false,
  className: '',
};
