import React from 'react'
import PropTypes from 'prop-types'
import { Label, Dropdown } from '@trussworks/react-uswds'
import ObjectiveStatusSuspendReason from '../../../../components/ObjectiveStatusSuspendReason'
import { OBJECTIVE_STATUS } from '../../../../Constants'

const statuses = Object.values(OBJECTIVE_STATUS)

export default function ObjectiveStatus({ status, onChangeStatus, onBlur, inputName, closeSuspendContext, closeSuspendReason, currentStatus }) {
  const inProgressStatuses = [OBJECTIVE_STATUS.IN_PROGRESS, OBJECTIVE_STATUS.SUSPENDED, OBJECTIVE_STATUS.COMPLETE]

  const availableStatuses =
    currentStatus && inProgressStatuses.includes(currentStatus) ? statuses.filter((s) => s !== OBJECTIVE_STATUS.NOT_STARTED) : statuses

  return (
    <>
      <Label>
        Objective status
        <Dropdown name={inputName} onChange={onChangeStatus} value={status} aria-label="Status for objective " onBlur={onBlur}>
          {availableStatuses.map((possibleStatus) => (
            <option key={possibleStatus} value={possibleStatus}>
              {possibleStatus}
            </option>
          ))}
        </Dropdown>
      </Label>
      <ObjectiveStatusSuspendReason status={status} closeSuspendReason={closeSuspendReason} closeSuspendContext={closeSuspendContext} />
    </>
  )
}

ObjectiveStatus.propTypes = {
  onChangeStatus: PropTypes.func.isRequired,
  status: PropTypes.string.isRequired,
  inputName: PropTypes.string,
  onBlur: PropTypes.func.isRequired,
  closeSuspendReason: PropTypes.string.isRequired,
  closeSuspendContext: PropTypes.string.isRequired,
  currentStatus: PropTypes.string.isRequired,
}

ObjectiveStatus.defaultProps = {
  inputName: 'objectiveStatus',
}
