import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import { Label, Dropdown } from '@trussworks/react-uswds';

export default function ObjectiveStatus({
  status,
  onChangeStatus,
  onBlur,
  inputName,
}) {
  useEffect(() => {
    if (!['In Progress', 'Suspended'].includes(status)) {
      onChangeStatus('In Progress');
    }
  }, [onChangeStatus, status]);

  return (
    <Label>
      Objective status
      <Dropdown
        name={inputName}
        onChange={onChangeStatus}
        value={status}
        onBlur={onBlur}
      >
        <option>In Progress</option>
        <option>Complete</option>
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
