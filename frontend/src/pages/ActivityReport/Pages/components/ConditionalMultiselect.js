import React from 'react';
import PropTypes from 'prop-types';
import { v4 as uuidv4 } from 'uuid';
import { FormGroup, Label } from '@trussworks/react-uswds';
import Select from 'react-select';
import { useFormContext } from 'react-hook-form/dist/index.ie11';
import selectOptionsReset from '../../../../components/selectOptionsReset';
import { ERROR_FORMAT } from './constants';
import useRegisterFormField from '../../../../hooks/useRegisterFormField';

const VALIDATION_DICTIONARY = {
  maxSelections: (validation) => (selectedOptions) => (
    selectedOptions.length <= validation.value
  ) || validation.message,
};

const VALIDATION_DICTIONARY_KEYS = Object.keys(VALIDATION_DICTIONARY);

const transformValidationsIntoRules = (validations) => validations.rules.reduce((
  acc, validation,
) => {
  const isValidKey = VALIDATION_DICTIONARY_KEYS.includes(validation.name);

  if (!isValidKey) {
    return acc;
  }

  return {
    ...acc,
    validate: {
      ...acc.validate,
      [validation.name]: (value) => VALIDATION_DICTIONARY[validation.name](validation)(value),
    },
  };
}, {
  validate: validations.required ? {
    mustSelectOne: (value) => value.length > 0 || 'Please select at least one option',
  } : {},
});

export default function ConditionalMultiselect({
  fieldData,
  validations,
  fieldName,
  defaultValue,
  isEditable,
}) {
  const rules = transformValidationsIntoRules(validations);

  const {
    onChange,
    onBlur,
    fieldValue,
    name,
  } = useRegisterFormField(
    fieldName,
    rules,
    defaultValue,
  );

  const { errors } = useFormContext();
  const error = errors[fieldName] ? ERROR_FORMAT(errors[name].message) : <></>;

  const handleOnChange = (selectedOptions) => {
    onChange(selectedOptions.map((option) => option.label));
  };

  const options = fieldData.options.map((label, value) => ({ label, value }));
  const selectedOptions = (fieldValue || []).map((label) => options
    .find((option) => option.label === label));

  if (!isEditable) {
    return (
      <>
        <p className="usa-prose text-bold margin-bottom-0">
          {fieldData.title}
        </p>
        <ul className="usa-list usa-list--unstyled">
          {(fieldValue || []).map((option) => (
            <li key={uuidv4()}>{option}</li>
          ))}
        </ul>
      </>
    );
  }

  return (
    <FormGroup error={error.props.children} key={name}>
      <Label htmlFor={name}>
        <>
          { fieldData.prompt }
          {' '}
          {validations.required && (<span className="smart-hub--form-required font-family-sans font-ui-xs">*</span>)}
        </>
      </Label>
      { fieldData.hint && (<span className="usa-hint">{fieldData.hint}</span>)}
      {error}
      <Select
        inputName={name}
        inputId={name}
        name={name}
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
  defaultValue: PropTypes.arrayOf(PropTypes.string).isRequired,
  isEditable: PropTypes.bool.isRequired,
};
