import React from 'react';
import PropTypes from 'prop-types';
import { useController, useFormContext } from 'react-hook-form/dist/index.ie11';
import { ERROR_FORMAT } from './constants';
import ConditionalMultiselect from '../../../../components/ConditionalMultiselect';

const VALIDATION_DICTIONARY = {
  maxSelections: (validation) => (selectedOptions) => (
    selectedOptions.length <= validation.value
  ) || validation.message,
};

const VALIDATION_DICTIONARY_KEYS = Object.keys(VALIDATION_DICTIONARY);

const RESPONSE_COMPLETION_DICTIONARY = {
  maxSelections: (validation, selectedOptions) => (
    selectedOptions.length === validation.value
  ),
};

const RESPONSE_COMPLETION_DICTIONARY_KEYS = Object.keys(RESPONSE_COMPLETION_DICTIONARY);

const confirmResponseComplete = (validations) => validations.rules.reduce((
  acc, validation,
) => {
  const isValidKey = RESPONSE_COMPLETION_DICTIONARY_KEYS.includes(validation.name);
  if (!isValidKey) {
    return acc;
  }

  return [
    ...acc,
    (selectedOptions) => (
      RESPONSE_COMPLETION_DICTIONARY[validation.name](validation, selectedOptions)
    ),
  ];
}, []);

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

export default function ConditionalMultiselectForHookForm({
  fieldData,
  validations,
  fieldName,
  defaultValue,
  isOnReport,
}) {
  const rules = transformValidationsIntoRules(validations);
  const completions = confirmResponseComplete(validations);

  const {
    field: {
      onChange,
      onBlur,
      value: fieldValue,
      name,
    },
  } = useController({
    name: fieldName,
    rules,
    defaultValue,
  });

  const { errors } = useFormContext();
  const error = errors[fieldName] ? ERROR_FORMAT(errors[name].message) : <></>;

  return (
    <ConditionalMultiselect
      fieldData={fieldData}
      validations={validations}
      fieldName={fieldName}
      fieldValue={fieldValue}
      isOnReport={isOnReport}
      completions={completions}
      onBlur={onBlur}
      onChange={onChange}
      error={error}
    />
  );
}
ConditionalMultiselectForHookForm.propTypes = {
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
  isOnReport: PropTypes.bool.isRequired,
};
