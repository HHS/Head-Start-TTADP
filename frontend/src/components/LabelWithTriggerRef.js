import React from 'react';
import PropTypes from 'prop-types';
import { Label } from '@trussworks/react-uswds';
import Req from './Req';

export default function LabelWithTriggerRef({
  children,
  triggerRef,
}) {
  return (
    <div className="display-flex">
      <Label className="margin-bottom-0" htmlFor="activityReason">
        {children}
      </Label>
      {' '}
      <Req />
      <button
        type="button"
        className="usa-button usa-button--unstyled margin-left-1 activity-summary-button-no-top-margin"
        ref={triggerRef}
      >
        Get help choosing an option
      </button>
    </div>
  );
}

LabelWithTriggerRef.propTypes = {
  children: PropTypes.node.isRequired,
  triggerRef: PropTypes.shape({ current: PropTypes.instanceOf(Element) }).isRequired,
};
