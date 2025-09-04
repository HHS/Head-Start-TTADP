import React, { useEffect, useState } from 'react';
import useDeepCompareEffect from 'use-deep-compare-effect';
import PropTypes from 'prop-types';
import { useController } from 'react-hook-form';
import { formatTitleForHtmlAttribute } from '../../formDataHelpers';
import ConditionalMultiselectForHookForm from './ConditionalMultiselectForHookForm';
import CONDITIONAL_FIELD_CONSTANTS from '../../../../components/condtionalFieldConstants';

const { updateRefToInitialValues } = CONDITIONAL_FIELD_CONSTANTS;

const formatPromptTitle = (field) => `${field.grantId}-${formatTitleForHtmlAttribute(field.title)}`;

export const FIELD_DICTIONARY = {
  multiselect: {
    render: (
      field,
      validations,
      value,
      userCanEdit,
      drawerButtonText,
      drawerTitle,
      drawerTagName,
      drawerClassName,
    ) => (
      <ConditionalMultiselectForHookForm
        validations={validations}
        fieldData={field}
        fieldName={formatPromptTitle(field)}
        defaultValue={value}
        key={`conditional-multiselect-${formatPromptTitle(field)}`}
        userCanEdit={userCanEdit}
        // drawer props forwarded from parent (GoalForm)
        drawerButtonText={drawerButtonText}
        drawerTitle={drawerTitle}
        drawerTagName={drawerTagName}
        drawerClassName={drawerClassName}
      />
    ),
  },
};

export default function ConditionalFieldsForHookForm({
  prompts,
  userCanEdit,
  heading,
  drawerButtonText,
  drawerTitle,
  drawerTagName,
  drawerClassName,
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

    const goalPrompts = (prompts || []).map(({ promptId, title, grantId }) => ({
      promptId, title, fieldName: formatPromptTitle({ title, grantId }), grantId,
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
        drawerButtonText,
        drawerTitle,
        drawerTagName,
        drawerClassName,
      );
    }

    return null;
  });

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
  drawerButtonText: PropTypes.string,
  drawerTitle: PropTypes.string,
  drawerTagName: PropTypes.string,
  drawerClassName: PropTypes.string,
};

ConditionalFieldsForHookForm.defaultProps = {
  userCanEdit: false,
  heading: null,
  drawerButtonText: '',
  drawerTitle: '',
  drawerTagName: '',
  drawerClassName: '',
};
