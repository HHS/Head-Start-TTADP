import React from 'react';
import PropTypes from 'prop-types';
import { FormGroup, Label, Dropdown } from '@trussworks/react-uswds';

export default function ObjectiveStatus({
  status,
  goalStatus,
  onChangeStatus,
  inputName,
}) {
  if (goalStatus === 'Draft') {
    return null;
  }

  if (status.toLowerCase() === 'complete') {
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
