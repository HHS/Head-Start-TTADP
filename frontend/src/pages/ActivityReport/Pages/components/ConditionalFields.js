import React, { useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useController } from 'react-hook-form/dist/index.ie11';
import ConditionalMultiselect from './ConditionalMultiselect';
import { formatTitleForHtmlAttribute } from '../../formDataHelpers';

const FIELD_DICTIONARY = {
  multiselect: {
    render: (field, isEditable) => (
      <ConditionalMultiselect
        fieldData={field}
        fieldName={formatTitleForHtmlAttribute(field.title)}
        isEditable={isEditable}
      />
    ),
  },
};

export default function ConditionalFields({ prompts, isOnReport, recipients }) {
  const {
    field: {
      onChange: onUpdateGoalPrompts,
    },
  } = useController({
    name: 'goalPrompts',
    defaultValue: [],
  });

  // this is temporary until the backend is worked out
  const promptValues = useMemo(() => recipients.map(({ id: grantId, name }) => (
    prompts.map((prompt) => ({
      ...prompt,
      prompt: `${prompt.prompt} - (${name})`,
      title: `${prompt.title} - ${name}`,
      responseData: {
        response: prompt.response,
        grantId,
      },
    })))).flat(), [prompts, recipients]);

  useEffect(() => {
    // on mount, update the goal conditional fields
    // with the prompt data
    onUpdateGoalPrompts(promptValues.map(({ promptId, title }) => ({
      promptId, title, fieldName: formatTitleForHtmlAttribute(title),
    })));
  }, [onUpdateGoalPrompts, promptValues]);

  const fields = promptValues.map((prompt) => {
    if (FIELD_DICTIONARY) {
      return FIELD_DICTIONARY[prompt.type].render(
        prompt,
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
  recipients: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.number.isRequired,
    name: PropTypes.string.isRequired,
  })).isRequired,
};
