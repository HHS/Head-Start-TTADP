import React from 'react';
import PropTypes from 'prop-types';
import { useFormContext } from 'react-hook-form';
import { ErrorMessage as ReactHookFormError } from '@hookform/error-message';
import {
  Label, FormGroup, ErrorMessage, Fieldset,
} from '@trussworks/react-uswds';

import './FormItem.css';

const labelPropTypes = {
  label: PropTypes.node.isRequired,
  children: PropTypes.node.isRequired,
};

function Checkbox({ label, children }) {
  return (
    <Fieldset unstyled>
      <legend>{label}</legend>
      {children}
    </Fieldset>
  );
}

Checkbox.propTypes = labelPropTypes;

function Field({ label, children }) {
  return (
    <Label>
      {label}
      {children}
    </Label>
  );
}

Field.propTypes = labelPropTypes;

function FormItem({
  label, children, required, name, isCheckbox,
}) {
  const { formState: { errors } } = useFormContext();
  const fieldErrors = errors[name];
  const labelWithRequiredTag = (
    <>
      {label}
      {required && (<span className="smart-hub--form-required"> (Required)</span>)}
    </>
  );

  const LabelType = isCheckbox ? Checkbox : Field;

  return (
    <FormGroup error={fieldErrors}>
      <LabelType label={labelWithRequiredTag}>
        <ReactHookFormError
          errors={errors}
          name={name}
          render={({ message }) => <ErrorMessage>{message}</ErrorMessage>}
        />
        {children}
      </LabelType>
    </FormGroup>
  );
}

FormItem.propTypes = {
  label: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
  name: PropTypes.string.isRequired,
  isCheckbox: PropTypes.bool,
  required: PropTypes.bool,
};

FormItem.defaultProps = {
  required: true,
  isCheckbox: false,
};

export default FormItem;
