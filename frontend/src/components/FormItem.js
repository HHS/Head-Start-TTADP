import React from 'react';
import PropTypes from 'prop-types';
import { useFormContext } from 'react-hook-form';
import { ErrorMessage as ReactHookFormError } from '@hookform/error-message';
import { Label, FormGroup, ErrorMessage } from '@trussworks/react-uswds';

import './FormItem.css';

function FormItem({
  label, children, required, name,
}) {
  const { formState: { errors } } = useFormContext();
  const fieldErrors = errors[name];

  return (
    <FormGroup error={fieldErrors}>
      <Label>
        {label}
        {required && (<span className="smart-hub--form-required"> (Required)</span>)}
        <ReactHookFormError
          errors={errors}
          name={name}
          render={({ message }) => <ErrorMessage>{message}</ErrorMessage>}
        />
        {children}
      </Label>
    </FormGroup>
  );
}

FormItem.propTypes = {
  label: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
  name: PropTypes.isRequired,
  required: PropTypes.bool,
};

FormItem.defaultProps = {
  required: true,
};

export default FormItem;
