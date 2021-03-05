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

function FieldSetWrapper({ label, children }) {
  return (
    <Fieldset unstyled>
      <legend>{label}</legend>
      {children}
    </Fieldset>
  );
}

FieldSetWrapper.propTypes = labelPropTypes;

function LabelWrapper({ label, children }) {
  return (
    <Label>
      {label}
      {children}
    </Label>
  );
}

LabelWrapper.propTypes = labelPropTypes;

function FormItem({
  label, children, required, name, fieldSetWrapper,
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
  fieldSetWrapper: PropTypes.bool,
  required: PropTypes.bool,
};

FormItem.defaultProps = {
  required: true,
  fieldSetWrapper: false,
};

export default FormItem;
