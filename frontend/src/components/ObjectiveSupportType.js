import React from 'react';
import PropTypes from 'prop-types';
import { SUPPORT_TYPES } from '@ttahub/common';
import { FormGroup, Label, Dropdown } from '@trussworks/react-uswds';
import Req from './Req';

export default function ObjectiveSupportType({
  supportType,
  onChangeSupportType,
  onBlurSupportType,
  inputName,
  isOnApprovedReport,
  error,
}) {
  if (isOnApprovedReport) {
    return (
      <>
        <p className="usa-prose margin-bottom-0 text-bold">Support type</p>
        {supportType}
      </>
    );
  }

  return (
    <FormGroup error={error.props.children}>
      <Label htmlFor={inputName}>
        Support type
        <Req />
      </Label>

      <Dropdown
        onChange={(e) => onChangeSupportType(e.target.value)}
        id={inputName}
        name={inputName}
        onBlur={onBlurSupportType}
        value={supportType}
      >
        <option disabled hidden value="">Select one</option>
        {SUPPORT_TYPES.map((option) => (<option key={option}>{option}</option>))}
      </Dropdown>
    </FormGroup>
  );
}

ObjectiveSupportType.propTypes = {
  supportType: PropTypes.string.isRequired,
  onChangeSupportType: PropTypes.func.isRequired,
  onBlurSupportType: PropTypes.func.isRequired,
  inputName: PropTypes.string.isRequired,
  isOnApprovedReport: PropTypes.bool.isRequired,
  error: PropTypes.node.isRequired,
};
