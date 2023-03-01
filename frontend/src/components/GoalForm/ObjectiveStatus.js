import React, { useMemo, useRef } from 'react';
import PropTypes from 'prop-types';
import { FormGroup, Label, Dropdown } from '@trussworks/react-uswds';

export default function ObjectiveStatus({
  status,
  goalStatus,
  onChangeStatus,
  inputName,
  isLoading,
  userCanEdit,
}) {
  // capture the initial status so updates to the status don't cause the dropdown to disappear
  const initialStatus = useRef(status);

  // if the goal is closed, the objective status should be read-only
  const hideDropdown = useMemo(() => {
    if (['Closed', 'Not Started'].includes(goalStatus) || !userCanEdit) {
      return true;
    }

    return false;
  }, [goalStatus, userCanEdit]);

  const options = useMemo(() => {
    // if the objective is complete, it can only go back to in progress
    if (initialStatus.current === 'Complete') {
      return (
        <>
          <option>In Progress</option>
          <option>Complete</option>
        </>
      );
    }

    // otherwise all the options should be available
    return (
      <>
        <option>Not Started</option>
        <option>In Progress</option>
        <option>Complete</option>
      </>
    );
  }, []);

  // if the goal is a draft, objective status sits in "in progress"
  if (goalStatus === 'Draft') {
    return null;
  }

  // if the objective is "in progress" and the goal is not closed we need a control to change status

  const onChange = (e) => onChangeStatus(e.target.value);

  if (!hideDropdown) {
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
          {options}
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
  userCanEdit: PropTypes.bool.isRequired,
};

ObjectiveStatus.defaultProps = {
  isLoading: false,
};
