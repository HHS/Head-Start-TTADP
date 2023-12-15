import React from 'react';
import PropTypes from 'prop-types';
import { useController, useFormContext } from 'react-hook-form';
import { ERROR_FORMAT } from './constants';
import ConditionalMultiselect from '../../../../components/ConditionalMultiselect';
import CONDITIONAL_FIELD_CONSTANTS from '../../../../components/condtionalFieldConstants';

const { multiselect } = CONDITIONAL_FIELD_CONSTANTS;
const { transformValidationsIntoRules } = multiselect;
export default function ConditionalMultiselectForHookForm({
  fieldData,
  validations,
  fieldName,
  defaultValue,
}) {
  const rules = transformValidationsIntoRules(validations);

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
    required: PropTypes.oneOfType([PropTypes.bool, PropTypes.string]),
    message: PropTypes.string,
  }).isRequired,
  defaultValue: PropTypes.arrayOf(PropTypes.string).isRequired,
};
