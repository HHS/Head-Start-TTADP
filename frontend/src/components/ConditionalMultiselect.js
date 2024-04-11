import React from 'react';
import PropTypes from 'prop-types';
import { v4 as uuidv4 } from 'uuid';
import { FormGroup, Label } from '@trussworks/react-uswds';
import Select from 'react-select';
import selectOptionsReset from './selectOptionsReset';

export default function ConditionalMultiselect({
  fieldData,
  validations,
  fieldName,
  fieldValue,
  onBlur,
  onChange,
  error,
  userCanEdit,
}) {
  const handleOnChange = (selections) => {
    onChange(selections.map((option) => option.label));
  };

  const options = fieldData.options.map((label, value) => ({ label, value }));
  const selectedOptions = (fieldValue || []).map((label) => options
    .find((option) => option.label === label));

  if (!userCanEdit) {
    if (!fieldValue || fieldValue.length === 0) {
      return null;
    }

    return (
      <>
        <p className="usa-prose text-bold margin-bottom-0">
          {fieldData.title}
        </p>
        <ul className="usa-list usa-list--unstyled">
          {fieldValue.map((option) => (
            <li key={uuidv4()}>{option}</li>
          ))}
        </ul>
      </>
    );
  }

  return (
    <FormGroup error={error.props.children} key={fieldName}>
      <Label htmlFor={fieldName}>
        <>
          { fieldData.prompt }
          {' '}
          {validations.required && (<span className="smart-hub--form-required font-family-sans font-ui-xs">*</span>)}
        </>
      </Label>
      { fieldData.hint && (<span className="usa-hint">{fieldData.hint}</span>)}
      {error}
      <Select
        inputName={fieldName}
        inputId={fieldName}
        name={fieldName}
        styles={selectOptionsReset}
        components={{
          DropdownIndicator: null,
        }}
        className="usa-select"
        isMulti
        options={options}
        onBlur={() => {
          onBlur(selectedOptions);
        }}
        value={selectedOptions}
        onChange={handleOnChange}
        closeMenuOnSelect={false}
        isDisabled={false}
      />
    </FormGroup>
  );
}

ConditionalMultiselect.propTypes = {
  fieldName: PropTypes.string.isRequired,
  fieldData: PropTypes.shape({
    title: PropTypes.string.isRequired,
    prompt: PropTypes.string.isRequired,
    options: PropTypes.arrayOf(PropTypes.string).isRequired,
    hint: PropTypes.string,
  }).isRequired,
  validations: PropTypes.shape({
    required: PropTypes.bool,
    message: PropTypes.string,
  }).isRequired,
  fieldValue: PropTypes.arrayOf(PropTypes.string).isRequired,
  error: PropTypes.node.isRequired,
  onChange: PropTypes.func.isRequired,
  onBlur: PropTypes.func.isRequired,
  userCanEdit: PropTypes.bool,
};

ConditionalMultiselect.defaultProps = {
  userCanEdit: false,
};
