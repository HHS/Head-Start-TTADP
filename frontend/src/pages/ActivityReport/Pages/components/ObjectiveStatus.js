import React, { useState, useEffect } from 'react';
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
}) {
  const [availableStatuses, setAvailableStatuses] = useState(statuses);

  // Only filter statuses once on initial render
  useEffect(() => {
    // Filter out 'Not Started' if status is already In Progress, Suspended, or Complete
    if (['In Progress', 'Suspended', 'Complete'].includes(status)) {
      setAvailableStatuses(statuses.filter((s) => s !== 'Not Started'));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array ensures this runs only once on mount

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
};

ObjectiveStatus.defaultProps = {
  inputName: 'objectiveStatus',
};
