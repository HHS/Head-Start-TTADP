import React from 'react';
import PropTypes from 'prop-types';
import { useFormContext } from 'react-hook-form/dist/index.ie11';
import { ErrorMessage as ReactHookFormError } from '@hookform/error-message';
import {
  Label, FormGroup, ErrorMessage, Fieldset,
} from '@trussworks/react-uswds';

import './FormItem.css';

const labelPropTypes = {
  label: PropTypes.node.isRequired,
  children: PropTypes.node.isRequired,
  className: PropTypes.string.isRequired,
  // eslint-disable-next-line react/no-unused-prop-types
  htmlFor: PropTypes.string,
};

const labelDefaultProps = {
  htmlFor: '',
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
FieldSetWrapper.defaultProps = labelDefaultProps;
function LabelWrapper({
  label, children, className, htmlFor,
}) {
  /**
   * The date picker component renders two inputs. This seemed to create
   * inconstent behavior as far as which input was being referenced by the enclosing label
   * especially in user testing library, so we're now adding the explicit
   * "for" attribute
   */

  if (htmlFor) {
    return (
      <Label className={className} htmlFor={htmlFor}>
        {label}
        {children}
      </Label>
    );
  }

  return (
    <Label className={className}>
      {label}
      {children}
    </Label>
  );
}

LabelWrapper.propTypes = labelPropTypes;
LabelWrapper.defaultProps = labelDefaultProps;

function FormItem({
  label, children, required, name, fieldSetWrapper, className, htmlFor,
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
      <LabelType htmlFor={htmlFor} label={labelWithRequiredTag} className={className}>
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
  htmlFor: PropTypes.string,
};

FormItem.defaultProps = {
  required: true,
  fieldSetWrapper: false,
  className: '',
  htmlFor: '',
};

export default FormItem;
