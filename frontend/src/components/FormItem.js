import React from 'react'
import PropTypes from 'prop-types'
import { useFormContext } from 'react-hook-form'
import { ErrorMessage as ReactHookFormError } from '@hookform/error-message'
import { Label, FormGroup, ErrorMessage, Fieldset } from '@trussworks/react-uswds'
import Req from './Req'
import QuestionTooltip from './QuestionTooltip'
import './FormItem.scss'

const labelPropTypes = {
  label: PropTypes.node.isRequired,
  children: PropTypes.node.isRequired,
  className: PropTypes.string.isRequired,
}

function FieldSetWrapper({ label, children, className }) {
  return (
    <Fieldset unstyled="true" className={className}>
      <legend>{label}</legend>
      {children}
    </Fieldset>
  )
}

FieldSetWrapper.propTypes = labelPropTypes

function LabelWrapper({ label, children, className, htmlFor, toolTipText = null }) {
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
          {toolTipText && <QuestionTooltip text={toolTipText} customClass="margin-left-0" />}
        </div>
        {children}
      </Label>
    )
  }

  return (
    <Label className={className}>
      {label}
      {children}
    </Label>
  )
}

LabelWrapper.propTypes = {
  ...labelPropTypes,
  htmlFor: PropTypes.string,
}

LabelWrapper.defaultProps = {
  htmlFor: '',
}

function FormItem({ label, hint, children, required, name, fieldSetWrapper, className, formGroupClassName, htmlFor, toolTipText, customLabel }) {
  const {
    formState: { errors },
  } = useFormContext()

  const fieldErrors = errors[name]
  const labelWithRequiredTag = (
    <>
      {label}
      {label && required && (
        <>
          {' '}
          <Req announce />
        </>
      )}
      {toolTipText && !htmlFor && <QuestionTooltip text={toolTipText} customClass="margin-right-1 no-print" />}
    </>
  )

  const LabelType = fieldSetWrapper ? FieldSetWrapper : LabelWrapper

  return (
    <FormGroup className={`tttahub-form-item ${formGroupClassName}`} error={fieldErrors}>
      {!label && customLabel}
      <LabelType htmlFor={htmlFor} label={labelWithRequiredTag} className={className} toolTipText={toolTipText}>
        {hint && (
          <>
            <br />
            <span className="usa-hint">{hint}</span>
            <br />
          </>
        )}
        <ReactHookFormError errors={errors} name={name} render={({ message }) => <ErrorMessage>{message}</ErrorMessage>} />
        {children}
      </LabelType>
    </FormGroup>
  )
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
}

FormItem.defaultProps = {
  customLabel: null,
  required: true,
  fieldSetWrapper: false,
  className: '',
  htmlFor: '',
  hint: '',
  toolTipText: null,
  formGroupClassName: '',
}

export default FormItem
