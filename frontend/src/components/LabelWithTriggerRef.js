import React from 'react';
import PropTypes from 'prop-types';
import { Label } from '@trussworks/react-uswds';
import Req from './Req';
import DrawerTriggerButton from './DrawerTriggerButton';

export default function LabelWithTriggerRef({
  children,
  buttonLabel,
  triggerRef,
  htmlFor,
  required,
}) {
  return (
    <div className="display-flex">
      <Label className={`margin-0 ${!required ? 'margin-right-1' : ''}`} htmlFor={htmlFor}>
        {children}
      </Label>
      {' '}
      {required && (<Req />)}
      <DrawerTriggerButton
        drawerTriggerRef={triggerRef}
      >
        {buttonLabel}
      </DrawerTriggerButton>
    </div>
  );
}

LabelWithTriggerRef.propTypes = {
  children: PropTypes.node.isRequired,
  triggerRef: PropTypes.shape({ current: PropTypes.instanceOf(Element) }).isRequired,
  buttonLabel: PropTypes.string.isRequired,
  htmlFor: PropTypes.string.isRequired,
  required: PropTypes.bool,
};

LabelWithTriggerRef.defaultProps = {
  required: false,
};
