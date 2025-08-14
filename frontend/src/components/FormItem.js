import React from 'react';
import PropTypes from 'prop-types';
import { useFormContext } from 'react-hook-form';
import { ErrorMessage as ReactHookFormError } from '@hookform/error-message';
import {
  Label, FormGroup, ErrorMessage, Fieldset, Tooltip,
} from '@trussworks/react-uswds';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import colors from '../colors';
import Req from './Req';

import './FormItem.scss';

const labelPropTypes = {
  label: PropTypes.node.isRequired,
  children: PropTypes.node.isRequired,
  className: PropTypes.string.isRequired,
};

function FieldSetWrapper({ label, children, className }) {
  return (
    <Fieldset unstyled="true" className={className}>
      <legend>{label}</legend>
      {children}
    </Fieldset>
  );
}

FieldSetWrapper.propTypes = labelPropTypes;

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

LabelWrapper.propTypes = {
  ...labelPropTypes,
  htmlFor: PropTypes.string,
};

LabelWrapper.defaultProps = {
  htmlFor: '',
};

function FormItem({
  label,
  hint,
  children,
  required,
  name,
  fieldSetWrapper,
  className,
  htmlFor,
  tooltipText,
}) {
  const { formState: { errors } } = useFormContext();

  // eslint-disable-next-line max-len, no-shadow, react/jsx-props-no-spreading
  const CustomTooltipElement = ({ children, ...tooltipProps }, ref) => (<span ref={ref} {...tooltipProps}>{children}</span>);
  const CustomTooltip = React.forwardRef(CustomTooltipElement);

  const fieldErrors = errors[name];
  const labelWithRequiredTag = (
    <>
      {label}
      {required && (
        <>
          {' '}
          <Req announce />
        </>
      )}
      {tooltipText && (
      <Tooltip asCustom={CustomTooltip} label={tooltipText}>
        <FontAwesomeIcon className="margin-right-1 no-print" data-testid="info-tooltip-icon" color={colors.ttahubBlue} icon={faInfoCircle} />
      </Tooltip>
      )}
    </>
  );

  const LabelType = fieldSetWrapper ? FieldSetWrapper : LabelWrapper;

  return (
    <FormGroup error={fieldErrors}>
      <LabelType htmlFor={htmlFor} label={labelWithRequiredTag} className={className}>
        {hint && (
        <>
          <br />
          <span className="usa-hint">{hint}</span>
          <br />
        </>
        )}
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
  label: PropTypes.oneOfType([PropTypes.node, PropTypes.string]).isRequired,
  children: PropTypes.node.isRequired,
  name: PropTypes.string.isRequired,
  fieldSetWrapper: PropTypes.bool,
  required: PropTypes.bool,
  className: PropTypes.string,
  htmlFor: PropTypes.string,
  hint: PropTypes.string,
  tooltipText: PropTypes.string,
};

FormItem.defaultProps = {
  required: true,
  fieldSetWrapper: false,
  className: '',
  htmlFor: '',
  hint: '',
  tooltipText: undefined,
};

export default FormItem;
