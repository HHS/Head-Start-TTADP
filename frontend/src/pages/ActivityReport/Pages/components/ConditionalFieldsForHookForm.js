import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import { Alert } from '@trussworks/react-uswds';
import { useController } from 'react-hook-form/dist/index.ie11';
import { formatTitleForHtmlAttribute } from '../../formDataHelpers';
import ConditionalMultiselectForHookForm from './ConditionalMultiselectForHookForm';

export const FIELD_DICTIONARY = {
  multiselect: {
    render: (field, validations, value = [], isOnReport) => (
      <ConditionalMultiselectForHookForm
        validations={validations}
        fieldData={field}
        fieldName={formatTitleForHtmlAttribute(field.title)}
        defaultValue={value}
        isOnReport={isOnReport}
      />
    ),
  },
};

export default function ConditionalFieldsForHookForm({
  prompts, isOnReport, isMultiRecipientReport,
}) {
  const {
    field: {
      onChange: onUpdateGoalPrompts,
    },
  } = useController({
    name: 'goalPrompts',
    defaultValue: [],
  });

  useEffect(() => {
    // on mount, update the goal conditional fields
    // with the prompt data

    const goalPrompts = prompts.map(({ promptId, title }) => ({
      promptId, title, fieldName: formatTitleForHtmlAttribute(title),
    }));

    onUpdateGoalPrompts(isMultiRecipientReport ? [] : goalPrompts);
  }, [onUpdateGoalPrompts, isMultiRecipientReport, prompts]);

  const fields = prompts.map((prompt) => {
    if (isMultiRecipientReport) {
      if (prompt.caution) {
        return (
          <Alert variant="warning" key={prompt.title}>
            {prompt.caution}
          </Alert>
        );
      }

      return null;
    }

    if (FIELD_DICTIONARY[prompt.fieldType]) {
      return FIELD_DICTIONARY[prompt.fieldType].render(
        prompt,
        prompt.validations,
        prompt.response,
        isOnReport,
      );
    }

    return null;
  });

  return fields;
}

ConditionalFieldsForHookForm.propTypes = {
  prompts: PropTypes.arrayOf(PropTypes.shape({
    fieldType: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    prompt: PropTypes.string.isRequired,
    options: PropTypes.arrayOf(PropTypes.string).isRequired,
  }.isRequired)).isRequired,
  isOnReport: PropTypes.bool.isRequired,
  isMultiRecipientReport: PropTypes.bool.isRequired,
};
