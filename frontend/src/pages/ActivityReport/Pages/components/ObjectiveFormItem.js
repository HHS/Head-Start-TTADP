import React from 'react';
import PropTypes from 'prop-types';
import { Label, ErrorMessage, FormGroup } from '@trussworks/react-uswds';

const ObjectiveFormItem = ({
  showErrors, message, label, value, children, className,
}) => {
  const showError = showErrors && value === '';

  return (
    <FormGroup error={showError}>
      <Label className={className}>
        {label}
        <span className="smart-hub--form-required"> (Required)</span>
        {showError && <ErrorMessage>{message}</ErrorMessage>}
        {children}
      </Label>
    </FormGroup>
  );
};

ObjectiveFormItem.propTypes = {
  showErrors: PropTypes.bool.isRequired,
  message: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
  value: PropTypes.string,
  className: PropTypes.string,
};

ObjectiveFormItem.defaultProps = {
  value: '',
  className: '',
};

export default ObjectiveFormItem;
