import React, { useEffect, useState } from 'react';
import useDeepCompareEffect from 'use-deep-compare-effect';
import PropTypes from 'prop-types';
import { useController } from 'react-hook-form';
import { formatTitleForHtmlAttribute } from '../../formDataHelpers';
import ConditionalMultiselectForHookForm from './ConditionalMultiselectForHookForm';
import CONDITIONAL_FIELD_CONSTANTS from '../../../../components/condtionalFieldConstants';

const { updateRefToInitialValues } = CONDITIONAL_FIELD_CONSTANTS;

export const FIELD_DICTIONARY = {
  multiselect: {
    render: (field, validations, value, userCanEdit) => (
      <ConditionalMultiselectForHookForm
        validations={validations}
        fieldData={field}
        fieldName={formatTitleForHtmlAttribute(field.title)}
        defaultValue={value}
        key={`conditional-multiselect-${formatTitleForHtmlAttribute(field.title)}`}
        userCanEdit={userCanEdit}
      />
    ),
  },
};

export default function ConditionalFieldsForHookForm({
  prompts,
  userCanEdit,
  heading,
}) {
  const {
    field: {
      onChange: onUpdateGoalPrompts,
    },
  } = useController({
    name: 'goalPrompts',
    defaultValue: [],
  });

  const [initialValues, setInitialValues] = useState([]);

  useDeepCompareEffect(() => {
    const newPromptValues = updateRefToInitialValues(initialValues, prompts);

    // save the new prompts to initialValues
    setInitialValues(newPromptValues);
  }, [prompts, initialValues]);

  useEffect(() => {
    // on mount, update the goal conditional fields
    // with the prompt data

    const goalPrompts = (prompts || []).map(({ promptId, title }) => ({
      promptId, title, fieldName: formatTitleForHtmlAttribute(title),
    }));
    onUpdateGoalPrompts(goalPrompts);
  }, [onUpdateGoalPrompts, prompts]);

  const fields = (prompts || []).map((prompt) => {
    if (FIELD_DICTIONARY[prompt.fieldType]) {
      return FIELD_DICTIONARY[prompt.fieldType].render(
        prompt,
        prompt.validations,
        prompt.response,
        userCanEdit,
      );
    }

    return null;
  });
  console.log('--------------- HEADING: ', heading);
  console.log('--------------- PROMPTS: ', prompts);
  return (
    <>
      {
      heading
      && prompts
      && prompts.length > 0
      && (<h3>{heading}</h3>)
      }
      {fields}
    </>
  );
}

ConditionalFieldsForHookForm.propTypes = {
  prompts: PropTypes.arrayOf(PropTypes.shape({
    fieldType: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    prompt: PropTypes.string.isRequired,
    options: PropTypes.arrayOf(PropTypes.string).isRequired,
  }.isRequired)).isRequired,
  userCanEdit: PropTypes.bool,
  heading: PropTypes.string,
};

ConditionalFieldsForHookForm.defaultProps = {
  userCanEdit: false,
  heading: null,
};
