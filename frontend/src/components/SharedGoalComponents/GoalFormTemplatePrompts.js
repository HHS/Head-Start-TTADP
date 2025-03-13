import React from 'react';
import PropTypes from 'prop-types';
import { Controller, useFormContext } from 'react-hook-form';
import { uniqueId } from 'lodash';
import { GOAL_FORM_FIELDS } from '../../pages/StandardGoalForm/constants';
import GenericSelectWithDrawer from '../GoalForm/GenericSelectWithDrawer';
import { ERROR_FORMAT } from '../../pages/ActivityReport/Pages/components/constants';
import { NO_ERROR } from '../../pages/SessionForm/constants';

export const validate = (value) => {
  if (value.length < 1) {
    return 'Select at least one root cause';
  }
  if (value.length > 2) {
    return 'Select a maximum of 2 root causes';
  }
  return true;
};
export default function GoalFormTemplatePrompts({ goalTemplatePrompts, fieldName }) {
  const { control, formState: { errors } } = useFormContext();

  // we can assume that there is only ever one prompt: for root causes
  // todo: if this ever changes, rewrite this to be generic
  if (!goalTemplatePrompts) {
    return null;
  }

  const error = errors[fieldName];

  return goalTemplatePrompts.map((prompt) => (
    <Controller
      key={uniqueId('goal-form-prompt-')}
      render={({ value, onChange, onBlur }) => (
        <GenericSelectWithDrawer
          error={error
            ? ERROR_FORMAT(error)
            : NO_ERROR}
          name={prompt.prompt}
          hint={prompt.hint}
          options={prompt.options.map((option) => ({ name: option, id: option })) || []}
          validateValues={(e) => {
            console.log(e);
            onBlur(e);
          }}
          values={value || []}
          onChangeValues={onChange}
          inputName={fieldName}
          isLoading={false}
          drawerButtonText="Get help choosing root causes"
          drawerContent={<></>}
          drawerTitle="Root causes"
        />
      )}
      name={fieldName}
      control={control}
      rules={{
        validate,
      }}
      defaultValue={null}
    />
  ));
}

GoalFormTemplatePrompts.propTypes = {
  fieldName: PropTypes.string,
  goalTemplatePrompts: PropTypes.arrayOf(PropTypes.shape({
    prompt: PropTypes.string,
    hint: PropTypes.string,
    options: PropTypes.arrayOf(PropTypes.string),
  })),
};

GoalFormTemplatePrompts.defaultProps = {
  goalTemplatePrompts: null,
  fieldName: GOAL_FORM_FIELDS.ROOT_CAUSES,
};
