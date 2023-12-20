import React from 'react';
import PropTypes from 'prop-types';
import { SUPPORT_TYPES } from '@ttahub/common';
import { FormGroup, Label, Dropdown } from '@trussworks/react-uswds';
import Req from './Req';
import FeatureFlag from './FeatureFlag';

export default function ObjectiveSupportType({
  supportType,
  onChangeSupportType,
  onBlurSupportType,
  inputName,
  error,
}) {
  return (
    <FeatureFlag flag="goal_source">
      <FormGroup error={error.props.children}>
        <Label htmlFor={inputName}>
          Support type
          <Req />
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
    </FeatureFlag>
  );
}

ObjectiveSupportType.propTypes = {
  supportType: PropTypes.string.isRequired,
  onChangeSupportType: PropTypes.func.isRequired,
  onBlurSupportType: PropTypes.func.isRequired,
  inputName: PropTypes.string.isRequired,
  error: PropTypes.node.isRequired,
};
