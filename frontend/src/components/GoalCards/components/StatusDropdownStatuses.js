/* eslint-disable react/jsx-props-no-spreading */
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
  'In progress': {
    display: 'In progress',
    color: colors.ttahubMediumBlue,
    icon: <InProgress />,
    IconWithProps: (props) => <InProgress {...props} />,
  },
  'In Progress': {
    display: 'In progress',
    color: colors.ttahubMediumBlue,
    icon: <InProgress />,
    IconWithProps: (props) => <InProgress {...props} />,
  },
  Closed: {
    display: 'Closed',
    color: colors.success,
    icon: <Closed />,
    IconWithProps: (props) => <Closed {...props} />,
  },
  // my database has "completed" goals in it, not sure why so leaving it in case of breakage
  Completed: {
    display: 'Closed',
    color: colors.success,
    icon: <Closed />,
    IconWithProps: (props) => <Closed {...props} />,
  },
  Complete: {
    display: 'Complete',
    color: colors.success,
    icon: <Closed />,
    IconWithProps: (props) => <Closed {...props} />,
  },
  Draft: {
    display: 'Draft',
    color: colors.ttahubBlue,
    icon: <Draft />,
    IconWithProps: (props) => <Draft {...props} />,
  },
  'Not Started': {
    display: 'Not started',
    color: colors.warning,
    icon: <NotStarted />,
    IconWithProps: (props) => <NotStarted {...props} />,
  },
  Suspended: {
    display: 'Suspended',
    color: colors.errorDark,
    icon: <Ceased />,
    IconWithProps: (props) => <Ceased {...props} />,
  },
  'Needs Status': {
    display: 'Needs status',
    color: colors.baseLighter,
    icon: <NoStatus />,
    IconWithProps: (props) => <NoStatus {...props} />,
  },
};

export default STATUSES;
