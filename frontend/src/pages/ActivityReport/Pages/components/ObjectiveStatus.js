import React from 'react';
import PropTypes from 'prop-types';
import { Label, Dropdown } from '@trussworks/react-uswds';

const statuses = [
  'Not Started',
  'In Progress',
  'Suspended',
  'Complete',
];

export default function ObjectiveStatus({
  status,
  onChangeStatus,
  onBlur,
  inputName,
}) {
  return (
    <Label>
      Objective status
      <Dropdown
        name={inputName}
        onChange={onChangeStatus}
        value={status}
        aria-label="Status for objective "
        onBlur={onBlur}
      >
        {statuses.map((possibleStatus) => (
          <option
            key={possibleStatus}
            value={possibleStatus}
          >
            {possibleStatus}
          </option>
        ))}
      </Dropdown>
    </Label>
  );
}

ObjectiveStatus.propTypes = {
  onChangeStatus: PropTypes.func.isRequired,
  status: PropTypes.string.isRequired,
  inputName: PropTypes.string,
  onBlur: PropTypes.func.isRequired,
};

ObjectiveStatus.defaultProps = {
  inputName: 'objectiveStatus',
};
