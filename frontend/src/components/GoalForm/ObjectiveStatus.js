import React from 'react';
import PropTypes from 'prop-types';
import { FormGroup, Label, Dropdown } from '@trussworks/react-uswds';

export default function ObjectiveStatus({
  status,
  goalStatus,
  onChangeStatus,
  inputName,
  isLoading,
}) {
  // if the goal is a draft, any objectives added
  // will have to be draft as well

  if (goalStatus === 'Draft') {
    return null;
  }

  // if the objective is "in progress" and the goal is not closed we need a control to change status
  const showDropdown = status === 'In Progress' && goalStatus !== 'Closed';

  const onChange = (e) => onChangeStatus(e.target.value);

  if (showDropdown) {
    return (
      <FormGroup>
        <Label htmlFor={inputName}>
          Objective status
        </Label>
        <Dropdown
          name={inputName}
          onChange={onChange}
          value={status}
          id={inputName}
          disabled={isLoading}
        >
          <option>Not Started</option>
          <option>In Progress</option>
          <option>Completed</option>
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
  isLoading: PropTypes.bool,
};

ObjectiveStatus.defaultProps = {
  isLoading: false,
};
