/* eslint-disable no-unused-vars */
import React from 'react';
import PropTypes from 'prop-types';
import ConditionalMultiselect from './ConditionalMultiselect';

export const FIELD_DICTIONARY = {
  multiselect: {
    render: (field, validations, completions = [], value = [], isOnReport) => (
      <ConditionalMultiselect
        fieldData={field}
        validations={validations}
        fieldName={field.title.replace(/\s/g, '-').toLowerCase()}
        fieldValue={value}
        isOnReport={isOnReport}
        completions={completions}
        onBlur={() => {}}
        onChange={() => {}}
        error={<></>}
      />
    ),
  },
};

export default function ConditionalFields({ prompts, isOnReport, setPrompts }) {
  return (
    <div>
      {prompts.map((prompt) => {
        const field = FIELD_DICTIONARY[prompt.fieldType];
        if (!field) {
          return null;
        }
        return field.render(prompt, {}, [], prompt.response, isOnReport);
      })}
    </div>
  );
}

ConditionalFields.propTypes = {
  prompts: PropTypes.arrayOf(
    PropTypes.shape({
      fieldType: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
    }),
  ).isRequired,
  isOnReport: PropTypes.bool.isRequired,
  setPrompts: PropTypes.func.isRequired,
};
