import React, { useRef } from 'react';
import PropTypes from 'prop-types';
import { Label, Dropdown } from '@trussworks/react-uswds';

export default function ObjectiveStatus({
  status,
  onChangeStatus,
  onBlur,
  inputName,
}) {
  const initialStatus = useRef(status);
  const options = (() => {
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
        <option>Suspended</option>
        <option>Complete</option>
      </>
    );
  })();

  return (
    <Label>
      Objective status
      <Dropdown
        name={inputName}
        onChange={onChangeStatus}
        value={status}
        onBlur={onBlur}
      >
        {options}
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
