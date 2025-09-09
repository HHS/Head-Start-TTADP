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
  closeSuspendContext,
  closeSuspendReason,
  currentStatus,
}) {
  // console.log('option status: ', currentStatus);
  const inProgressStatuses = ['In Progress', 'Suspended', 'Complete'];

  const availableStatuses = currentStatus && inProgressStatuses.includes(currentStatus)
    ? statuses.filter((s) => s !== 'Not Started')
    : statuses;

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
          {availableStatuses.map((possibleStatus) => (
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
        closeSuspendReason={closeSuspendReason}
        closeSuspendContext={closeSuspendContext}
      />
    </>
  );
}

ObjectiveStatus.propTypes = {
  onChangeStatus: PropTypes.func.isRequired,
  status: PropTypes.string.isRequired,
  inputName: PropTypes.string,
  onBlur: PropTypes.func.isRequired,
  closeSuspendReason: PropTypes.string.isRequired,
  closeSuspendContext: PropTypes.string.isRequired,
  currentStatus: PropTypes.string.isRequired,
};

ObjectiveStatus.defaultProps = {
  inputName: 'objectiveStatus',
};
