import React, { useRef } from 'react'
import PropTypes from 'prop-types'
import { FormGroup, Label, Dropdown } from '@trussworks/react-uswds'
import { uniqueId } from 'lodash'
import useValidObjectiveStatuses from '../../hooks/useValidObjectiveStatuses'

export default function ObjectiveStatus({ status, goalStatus, onChangeStatus, inputName, isLoading, userCanEdit }) {
  // capture the initial status so updates to the status don't cause the dropdown to disappear
  const initialStatus = useRef(status)
  const [statusOptions, hideDropdown] = useValidObjectiveStatuses(goalStatus, userCanEdit, initialStatus.current)

  const options = statusOptions.map((option) => <option key={uniqueId('objective-status-change-option')}>{option}</option>)

  // if the goal is a draft, objective status sits in "in progress"
  if (goalStatus === 'Draft') {
    return null
  }

  const onChange = (e) => onChangeStatus(e.target.value)

  if (!hideDropdown) {
    return (
      <FormGroup>
        <Label htmlFor={inputName}>Objective status</Label>
        <Dropdown name={inputName} onChange={onChange} value={status} id={inputName} disabled={isLoading}>
          {options}
        </Dropdown>
      </FormGroup>
    )
  }

  // otherwise, we simply display the status as a read only indicator, not a form field

  return (
    <>
      <p className="usa-prose margin-bottom-0 text-bold">Objective status</p>
      <p className="usa-prose margin-top-0">{status}</p>
    </>
  )
}

ObjectiveStatus.propTypes = {
  status: PropTypes.string.isRequired,
  goalStatus: PropTypes.string.isRequired,
  inputName: PropTypes.string.isRequired,
  onChangeStatus: PropTypes.func.isRequired,
  isLoading: PropTypes.bool,
  userCanEdit: PropTypes.bool.isRequired,
}

ObjectiveStatus.defaultProps = {
  isLoading: false,
}
