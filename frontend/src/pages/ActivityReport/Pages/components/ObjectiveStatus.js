import React from 'react';
import PropTypes from 'prop-types';
import { Label, Dropdown } from '@trussworks/react-uswds';
import ObjectiveStatusSuspendReason from '../../../../components/ObjectiveStatusSuspendReason';

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
  suspendReason,
  suspendContext,
}) {
  return (
    <>
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
      <ObjectiveStatusSuspendReason
        status={status}
        suspendReason={suspendReason}
        suspendContext={suspendContext}
      />
    </>
  );
}

ObjectiveStatus.propTypes = {
  onChangeStatus: PropTypes.func.isRequired,
  status: PropTypes.string.isRequired,
  inputName: PropTypes.string,
  onBlur: PropTypes.func.isRequired,
  suspendReason: PropTypes.string.isRequired,
  suspendContext: PropTypes.string.isRequired,
};

ObjectiveStatus.defaultProps = {
  inputName: 'objectiveStatus',
};
