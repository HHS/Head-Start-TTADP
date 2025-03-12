import React from 'react';
import PropTypes from 'prop-types';
import { Controller, useFormContext } from 'react-hook-form';
import { uniqueId } from 'lodash';
import Select from 'react-select';
import FormItem from '../FormItem';
import { GOAL_FORM_FIELDS } from '../../pages/StandardGoalForm/constants';
import selectOptionsReset from '../selectOptionsReset';

export default function GoalFormTemplatePrompts({ goalTemplatePrompts, fieldName }) {
  const { control } = useFormContext();

  // we can assume that there is only ever one prompt: for root causes
  // todo: if this ever changes, rewrite this to be generic
  if (!goalTemplatePrompts) {
    return null;
  }

  return goalTemplatePrompts.map((prompt) => (
    <Controller
      key={uniqueId('goal-form-prompt-')}
      render={({ value, onChange, onBlur }) => (
        <FormItem
          label={prompt.prompt}
          hint={prompt.hint}
          name={fieldName}
          required
        >
          <Select
            isMulti
            aria-label="Select recipient's goal"
            inputId={fieldName}
            name={fieldName}
            className="usa-select"
            styles={selectOptionsReset}
            onChange={onChange}
            options={prompt.options.map((option) => ({ name: option, id: option })) || []}
            placeholder="- Select -"
            value={value}
            getOptionLabel={(option) => option.name}
            getOptionValue={(option) => option.id}
            onBlur={onBlur}
          />
        </FormItem>
      )}
      name={fieldName}
      control={control}
      rules={{
        validate: (value) => {
          if (value.length < 1) {
            return 'Select at least one root cause';
          }
          if (value.length > 2) {
            return 'Select a maximum of 2 root causes';
          }
          return true;
        },
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
