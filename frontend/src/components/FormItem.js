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
  className: PropTypes.string.isRequired,
};

function FieldSetWrapper({ label, children, className }) {
  return (
    <Fieldset unstyled className={className}>
      <legend>{label}</legend>
      {children}
    </Fieldset>
  );
}

FieldSetWrapper.propTypes = labelPropTypes;

function LabelWrapper({ label, children, className }) {
  return (
    <Label className={className}>
      {label}
      {children}
    </Label>
  );
}

LabelWrapper.propTypes = labelPropTypes;

function FormItem({
  label, children, required, name, fieldSetWrapper, className,
}) {
  const { formState: { errors } } = useFormContext();
  const fieldErrors = errors[name];
  const labelWithRequiredTag = (
    <>
      {label}
      {required && (<span className="smart-hub--form-required font-family-sans font-ui-xs"> (Required)</span>)}
    </>
  );

  const LabelType = fieldSetWrapper ? FieldSetWrapper : LabelWrapper;

  return (
    <FormGroup error={fieldErrors}>
      <LabelType label={labelWithRequiredTag} className={className}>
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
  fieldSetWrapper: PropTypes.bool,
  required: PropTypes.bool,
  className: PropTypes.string,
};

FormItem.defaultProps = {
  required: true,
  fieldSetWrapper: false,
  className: '',
};

export default FormItem;
