import React, { useContext, useMemo } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faAngleDown,
} from '@fortawesome/free-solid-svg-icons';
import { DECIMAL_BASE } from '@ttahub/common';
import {
  InProgress,
  Closed,
  NoStatus,
  NotStarted,
  Draft,
  Ceased,
} from '../../icons';
import colors from '../../../colors';
import UserContext from '../../../UserContext';
import { canChangeGoalStatus } from '../../../permissions';
import Menu from '../../Menu';
import './StatusDropdown.css';

export const STATUSES = {
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
  Complete: {
    display: 'Complete',
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
  Suspended: {
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
    <Menu
      label={`Change status for goal ${goalId}`}
      menuItems={options}
      left={false}
      up={false}
      className={`ttahub-status-select ${className}`}
      buttonText={(
        <>
          {icon}
          {display}
          <FontAwesomeIcon className="margin-left-1" size="1x" color={colors.ttahubMediumBlue} icon={faAngleDown} />
        </>
      )}
    />
  );
}

StatusDropdown.propTypes = {
  goalId: PropTypes.number.isRequired,
  onUpdateGoalStatus: PropTypes.func.isRequired,
  status: PropTypes.string,
  previousStatus: PropTypes.string,
  regionId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  showReadOnlyStatus: PropTypes.bool,
  className: PropTypes.string,
};

StatusDropdown.defaultProps = {
  status: '',
  previousStatus: null,
  showReadOnlyStatus: false,
  className: '',
};
