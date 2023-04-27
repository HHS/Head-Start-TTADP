import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import { useController } from 'react-hook-form/dist/index.ie11';
import ConditionalMultiselect from './ConditionalMultiselect';
import { formatTitleForHtmlAttribute } from '../../formDataHelpers';

const FIELD_DICTIONARY = {
  multiselect: {
    render: (field, validations = [], value = [], isEditable) => (
      <ConditionalMultiselect
        fieldData={field}
        validations={validations}
        fieldName={formatTitleForHtmlAttribute(field.title)}
        defaultValue={value}
        isEditable={isEditable}
      />
    ),
  },
};

export default function ConditionalFields({ prompts, isOnReport }) {
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
    onUpdateGoalPrompts(prompts.map(({ promptId, title }) => ({
      promptId, title, fieldName: formatTitleForHtmlAttribute(title),
    })));
  }, [onUpdateGoalPrompts, prompts]);

  const fields = prompts.map((prompt) => {
    if (FIELD_DICTIONARY) {
      return FIELD_DICTIONARY[prompt.type].render(
        prompt,
        prompt.validations,
        prompt.response,
        !isOnReport,
      );
    }

    return null;
  });

  return fields;
}

ConditionalFields.propTypes = {
  prompts: PropTypes.arrayOf(PropTypes.shape({
    type: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    prompt: PropTypes.string.isRequired,
    options: PropTypes.arrayOf(PropTypes.string).isRequired,
  }.isRequired)).isRequired,
  isOnReport: PropTypes.bool.isRequired,
};
