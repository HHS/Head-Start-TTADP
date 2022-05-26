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
import Menu from '../Menu';

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
  up,
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

  const getOptions = () => {
    // if the goal is ceased and has no "status suspended from" in the db you can only close it
    // otherwise, if it is ceased and has a status suspended from, you get that as an
    // additional option
    if (status === 'Ceased/Suspended') {
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

    if (status !== 'In Progress') {
      return [
        {
          label: 'Not started',
          onClick: () => onUpdateGoalStatus('Not Started'),
        },
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
          onClick: () => onUpdateGoalStatus('Ceased/Suspended'),
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
        onClick: () => onUpdateGoalStatus('Ceased/Suspended'),
      },
    ];
  };

  const options = getOptions();

  return (
    <Menu
      label={`Change status for goal ${goalId}`}
      menuItems={options}
      left={false}
      up={up}
      buttonText={(
        <>
          {icon}
          {display}
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
  up: PropTypes.bool,
  regionId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
};

StatusDropdown.defaultProps = {
  status: '',
  previousStatus: null,
  up: false,
};
