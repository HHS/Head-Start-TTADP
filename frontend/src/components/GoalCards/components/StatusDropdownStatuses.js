import React from 'react';
import colors from '../../../colors';
import {
  InProgress,
  Closed,
  NoStatus,
  NotStarted,
  Draft,
  Ceased,
} from '../../icons';

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

export default STATUSES;
