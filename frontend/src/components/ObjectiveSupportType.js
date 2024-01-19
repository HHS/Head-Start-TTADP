import React, { useRef } from 'react';
import PropTypes from 'prop-types';
import { SUPPORT_TYPES } from '@ttahub/common';
import { FormGroup, Label, Dropdown } from '@trussworks/react-uswds';
import Req from './Req';
import SupportTypeDrawer from './SupportTypeDrawer';

export default function ObjectiveSupportType({
  supportType,
  onChangeSupportType,
  onBlurSupportType,
  inputName,
  error,
}) {
  const supportTypeDrawerTriggerRef = useRef(null);
  const hasError = !!(error.props.children);
  return (
    <FormGroup error={hasError}>
      <SupportTypeDrawer
        drawerTriggerRef={supportTypeDrawerTriggerRef}
      />
      <Label htmlFor={inputName}>
        Support type
        <Req />
        {error}
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
      </Label>
    </FormGroup>
  );
}

ObjectiveSupportType.propTypes = {
  supportType: PropTypes.string.isRequired,
  onChangeSupportType: PropTypes.func.isRequired,
  onBlurSupportType: PropTypes.func.isRequired,
  inputName: PropTypes.string.isRequired,
  error: PropTypes.node.isRequired,
};
