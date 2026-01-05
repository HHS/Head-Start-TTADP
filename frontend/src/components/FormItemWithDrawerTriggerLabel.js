import React from 'react';
import PropTypes from 'prop-types';
import { useFormContext } from 'react-hook-form';
import { ErrorMessage as ReactHookFormError } from '@hookform/error-message';
import { FormGroup, ErrorMessage } from '@trussworks/react-uswds';
import LabelWithTriggerRef from './LabelWithTriggerRef';

function FormItemWithDrawerTriggerLabel({
  children,
  name,
  drawerTriggerRef,
  drawerTriggerLabel,
  label,
  required,
}) {
  const { formState: { errors } } = useFormContext();

  const fieldErrors = errors[name];

  return (
    <FormGroup className="ttahub-form-item" error={fieldErrors}>
      <LabelWithTriggerRef
        buttonLabel={drawerTriggerLabel}
        triggerRef={drawerTriggerRef}
        required={required}
        htmlFor={name}
      >
        {label}
      </LabelWithTriggerRef>
      <ReactHookFormError
        errors={errors}
        name={name}
        render={({ message }) => <ErrorMessage>{message}</ErrorMessage>}
      />
      {children}
    </FormGroup>
  );
}

FormItemWithDrawerTriggerLabel.propTypes = {
  label: PropTypes.oneOfType([PropTypes.node, PropTypes.string]).isRequired,
  children: PropTypes.node.isRequired,
  name: PropTypes.string.isRequired,
  drawerTriggerRef: PropTypes.shape({ current: PropTypes.instanceOf(Element) }).isRequired,
  drawerTriggerLabel: PropTypes.string.isRequired,
  required: PropTypes.bool,
};

FormItemWithDrawerTriggerLabel.defaultProps = {
  required: true,
};

export default FormItemWithDrawerTriggerLabel;
