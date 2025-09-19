import React from 'react';
import PropTypes from 'prop-types';
import { useFormContext } from 'react-hook-form';
import { ErrorMessage as ReactHookFormError } from '@hookform/error-message';
import {
  Label, FormGroup, ErrorMessage, Fieldset, Tooltip,
} from '@trussworks/react-uswds';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faQuestionCircle } from '@fortawesome/free-solid-svg-icons';
import colors from '../colors';
import Req from './Req';
import QuestionTooltip from './QuestionTooltip';
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
  label, children, className, htmlFor, toolTipText = null,
}) {
  /**
   * The date picker component renders two inputs. This seemed to create
   * inconsistent behavior as far as which input was being referenced by the enclosing label
   * especially in user testing library, so we're now adding the explicit
   * "for" attribute
   */

  if (htmlFor) {
    return (
      <Label className={className} htmlFor={htmlFor}>
        <div>
          {label}
          {toolTipText && (
            <QuestionTooltip
              text={toolTipText}
              className="margin-left-0"
            />
          )}
        </div>
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
  formGroupClassName,
  htmlFor,
  toolTipText,
  customLabel,
}) {
  const { formState: { errors } } = useFormContext();

  // eslint-disable-next-line max-len, no-shadow, react/jsx-props-no-spreading
  const CustomTooltipElement = ({ children, ...tooltipProps }, ref) => (<span ref={ref} {...tooltipProps}>{children}</span>);
  const CustomTooltip = React.forwardRef(CustomTooltipElement);

  const fieldErrors = errors[name];
  const labelWithRequiredTag = (
    <>
      {label}
      {label && required && (
        <>
          {' '}
          <Req announce />
        </>
      )}
      {toolTipText && (
      <Tooltip asCustom={CustomTooltip} label={toolTipText}>
        <FontAwesomeIcon className="margin-right-1 no-print" data-testid="info-tooltip-icon" color={colors.ttahubMediumBlue} icon={faQuestionCircle} />
      </Tooltip>
      )}
    </>
  );

  const LabelType = fieldSetWrapper ? FieldSetWrapper : LabelWrapper;

  return (
    <FormGroup className={formGroupClassName} error={fieldErrors}>
      {
        !label && (customLabel)
       }
      <LabelType
        htmlFor={htmlFor}
        label={labelWithRequiredTag}
        className={className}
        toolTipText={toolTipText}
      >
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
  customLabel: PropTypes.oneOfType([PropTypes.node, PropTypes.string]),
  children: PropTypes.node.isRequired,
  name: PropTypes.string.isRequired,
  fieldSetWrapper: PropTypes.bool,
  required: PropTypes.bool,
  className: PropTypes.string,
  htmlFor: PropTypes.string,
  hint: PropTypes.string,
  toolTipText: PropTypes.string,
  formGroupClassName: PropTypes.string,
};

FormItem.defaultProps = {
  customLabel: null,
  required: true,
  fieldSetWrapper: false,
  className: '',
  htmlFor: '',
  hint: '',
  toolTipText: null,
  formGroupClassName: '',
};

export default FormItem;
