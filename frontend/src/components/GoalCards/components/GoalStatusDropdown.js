import React, { useContext, useMemo } from 'react'
import PropTypes from 'prop-types'
import { DECIMAL_BASE, GOAL_STATUS } from '@ttahub/common'
import UserContext from '../../../UserContext'
import { canChangeGoalStatus } from '../../../permissions'
import STATUSES from './StatusDropdownStatuses'
import StatusDropdown from './StatusDropdown'

export default function GoalStatusDropdown({ goalId, status, onUpdateGoalStatus, previousStatus, regionId, showReadOnlyStatus, className }) {
  const { user } = useContext(UserContext)
  const { icon, display } = STATUSES[status] || STATUSES['Needs Status']

  const isReadOnly = useMemo(
    () =>
      status === GOAL_STATUS.DRAFT ||
      status === 'Completed' ||
      status === GOAL_STATUS.CLOSED ||
      !canChangeGoalStatus(user, parseInt(regionId, DECIMAL_BASE)) ||
      showReadOnlyStatus,
    [status, user, regionId, showReadOnlyStatus]
  )

  if (isReadOnly) {
    return (
      <div className={className}>
        {icon}
        {display}
      </div>
    )
  }

  const getOptions = () => {
    // if the goal is ceased and has no "status suspended from" in the db you can only close it
    // otherwise, if it is ceased and has a status suspended from, you get that as an
    // additional option
    if (status === 'Ceased/Suspended' || status === GOAL_STATUS.SUSPENDED) {
      if (!STATUSES[previousStatus]) {
        return [
          {
            label: GOAL_STATUS.CLOSED,
            onClick: () => onUpdateGoalStatus(GOAL_STATUS.CLOSED),
          },
        ]
      }

      const statusSuspendedFromDisplay = STATUSES[previousStatus].display
      return [
        {
          label: statusSuspendedFromDisplay,
          onClick: () => onUpdateGoalStatus(previousStatus),
        },
        {
          label: GOAL_STATUS.CLOSED,
          onClick: () => onUpdateGoalStatus(GOAL_STATUS.CLOSED),
        },
      ]
    }

    if (status === GOAL_STATUS.IN_PROGRESS || status === GOAL_STATUS.NOT_STARTED) {
      return [
        {
          label: GOAL_STATUS.CLOSED,
          onClick: () => onUpdateGoalStatus(GOAL_STATUS.CLOSED),
        },
        {
          label: GOAL_STATUS.SUSPENDED,
          onClick: () => onUpdateGoalStatus(GOAL_STATUS.SUSPENDED),
        },
      ]
    }

    return [
      {
        label: GOAL_STATUS.IN_PROGRESS,
        onClick: () => onUpdateGoalStatus(GOAL_STATUS.IN_PROGRESS),
      },
      {
        label: GOAL_STATUS.CLOSED,
        onClick: () => onUpdateGoalStatus(GOAL_STATUS.CLOSED),
      },
      {
        label: GOAL_STATUS.SUSPENDED,
        onClick: () => onUpdateGoalStatus(GOAL_STATUS.SUSPENDED),
      },
    ]
  }

  const options = getOptions()

  return (
    <StatusDropdown
      label={`Change status for goal ${goalId}`}
      options={options}
      className={className}
      icon={icon}
      display={display}
      buttonTestId="goal-status-dropdown"
    />
  )
}

GoalStatusDropdown.propTypes = {
  goalId: PropTypes.number.isRequired,
  onUpdateGoalStatus: PropTypes.func.isRequired,
  status: PropTypes.string,
  previousStatus: PropTypes.string,
  regionId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  showReadOnlyStatus: PropTypes.bool,
  className: PropTypes.string,
}

GoalStatusDropdown.defaultProps = {
  status: '',
  previousStatus: null,
  showReadOnlyStatus: false,
  className: '',
}
