import React from 'react';
import PropTypes from 'prop-types';
import { FormGroup, Label, Dropdown } from '@trussworks/react-uswds';

export default function ObjectiveStatus({
  status,
  goalStatus,
  onChangeStatus,
  inputName,
}) {
  // if the goal is a draft, any objectives added
  // will have to be draft as well

  if (goalStatus === 'Draft') {
    return null;
  }

  // if the objective has been completed or is "in progress"
  // we need a control to change status

  const showDropdown = status.toLowerCase() === 'complete' || status.toLowerCase() === 'in progress';

  if (showDropdown) {
    return (
      <FormGroup>
        <Label htmlFor={inputName}>
          Text input label
        </Label>
        <Dropdown name={inputName} onChange={onChangeStatus}>
          <option>In progress</option>
          <option>Complete</option>
        </Dropdown>
      </FormGroup>
    );
  }

  // otherwise, we simply display the status as a read only indicator, not a form field

  return (
    <>
      <p className="usa-prose margin-bottom-0 text-bold">Objective status</p>
      <p className="usa-prose margin-top-0">{status}</p>
    </>
  );
}

ObjectiveStatus.propTypes = {
  status: PropTypes.string.isRequired,
  goalStatus: PropTypes.string.isRequired,
  inputName: PropTypes.string.isRequired,
  onChangeStatus: PropTypes.func.isRequired,
};
