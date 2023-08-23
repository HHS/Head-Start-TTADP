import React, { useRef } from 'react';
import PropTypes from 'prop-types';
import { SUPPORT_TYPES } from '@ttahub/common';
import { FormGroup, Label, Dropdown } from '@trussworks/react-uswds';
import Drawer from './Drawer';
import ContentFromFeedByTag from './ContentFromFeedByTag';
import Req from './Req';
import './ObjectiveSupportType.scss';

export default function ObjectiveSupportType({
  supportType,
  onChangeSupportType,
  onBlurSupportType,
  inputName,
  error,
}) {
  const drawerTriggerRef = useRef(null);
  return (
    <>
      <Drawer
        triggerRef={drawerTriggerRef}
        stickyHeader
        stickyFooter
        title="Support type guidance"
      >
        <ContentFromFeedByTag className="ttahub-drawer--objective-support-type-guidance" tagName="ttahub-tta-support-type" contentSelector="table" />
      </Drawer>
      <FormGroup error={error.props.children}>
        <Label htmlFor={inputName}>
          <>
            Support type
            {' '}
            <Req />
            <button
              type="button"
              className="usa-button usa-button--unstyled margin-left-1"
              ref={drawerTriggerRef}
            >
              Get help choosing a support type
            </button>
          </>
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
    </>
  );
}

ObjectiveSupportType.propTypes = {
  supportType: PropTypes.string.isRequired,
  onChangeSupportType: PropTypes.func.isRequired,
  onBlurSupportType: PropTypes.func.isRequired,
  inputName: PropTypes.string.isRequired,
  error: PropTypes.node.isRequired,
};
