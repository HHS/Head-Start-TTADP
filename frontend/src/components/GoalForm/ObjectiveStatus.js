/* eslint-disable no-unused-vars */
import React from 'react';
import PropTypes from 'prop-types';
import { Dropdown } from '@trussworks/react-uswds';

export default function ObjectiveStatus({
  status,
  isOnApprovedReport,
  goalStatus,
  onChangeStatus,
}) {
  if (goalStatus === 'Draft') {
    return null;
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
  isOnApprovedReport: PropTypes.bool.isRequired,
  goalStatus: PropTypes.string.isRequired,
  onChangeStatus: PropTypes.func.isRequired,
};
