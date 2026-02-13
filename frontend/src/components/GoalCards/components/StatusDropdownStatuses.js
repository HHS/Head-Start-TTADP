/* eslint-disable react/jsx-props-no-spreading */
import React from 'react'
import { GOAL_STATUS } from '@ttahub/common/src/constants'
import colors from '../../../colors'
import { InProgress, Closed, NoStatus, NotStarted, Draft, Paused } from '../../icons'

const STATUSES = {
  'In progress': {
    display: GOAL_STATUS.IN_PROGRESS,
    color: colors.ttahubMediumBlue,
    icon: <InProgress />,
    IconWithProps: (props) => <InProgress {...props} />,
  },
  'In Progress': {
    display: GOAL_STATUS.IN_PROGRESS,
    color: colors.ttahubMediumBlue,
    icon: <InProgress />,
    IconWithProps: (props) => <InProgress {...props} />,
  },
  Closed: {
    display: GOAL_STATUS.CLOSED,
    color: colors.success,
    icon: <Closed />,
    IconWithProps: (props) => <Closed {...props} />,
  },
  // my database has "completed" goals in it, not sure why so leaving it in case of breakage
  Completed: {
    display: GOAL_STATUS.CLOSED,
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
    display: GOAL_STATUS.DRAFT,
    color: colors.ttahubBlue,
    icon: <Draft />,
    IconWithProps: (props) => <Draft {...props} />,
  },
  'Not Started': {
    display: GOAL_STATUS.NOT_STARTED,
    color: colors.warning,
    icon: <NotStarted />,
    IconWithProps: (props) => <NotStarted {...props} />,
  },
  Suspended: {
    display: GOAL_STATUS.SUSPENDED,
    color: colors.errorDark,
    icon: <Paused />,
    IconWithProps: (props) => <Paused {...props} />,
  },
  'Needs Status': {
    display: 'Needs status',
    color: colors.baseLighter,
    icon: <NoStatus />,
    IconWithProps: (props) => <NoStatus {...props} />,
  },
}

export default STATUSES
