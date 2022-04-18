import React from 'react';
import PropTypes from 'prop-types';
import { Label, Dropdown } from '@trussworks/react-uswds';

const statuses = [
  'Not Started',
  'In Progress',
  'Complete',
];

export default function ObjectiveStatus({ status, onChangeStatus }) {
  return (
    <Label>
      Status
      <Dropdown
        name="status"
        onChange={onChangeStatus}
        value={status}
        aria-label="Status for objective "
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
};
