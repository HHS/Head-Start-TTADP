import React, {
  useEffect,
} from 'react';
import Select from 'react-select';
import PropTypes from 'prop-types';
import { Controller, useFormContext } from 'react-hook-form';
import selectOptionsReset from '../selectOptionsReset';
import FormItem from '../FormItem';

export default function GoalNudgeInitiativePicker({
  goalTemplates,
  initiativeRef,
  useOhsInitiativeGoal,
}) {
  const { control, setValue, watch } = useFormContext();
  const { goalTemplate } = watch();

  useEffect(() => {
    // reset selection when useOhsInitiativeGoal is toggled
    // or if we don't have any valid goal templates
    if (!useOhsInitiativeGoal && goalTemplate) {
      // should clear out selection
      setValue('goalTemplate', null);
    }
  }, [goalTemplate, goalTemplates, setValue, useOhsInitiativeGoal]);

  if (!useOhsInitiativeGoal) {
    return null;
  }

  const rules = useOhsInitiativeGoal ? { required: 'Select a goal' } : {};

  return (
    <Controller
      render={({ value, onChange, onBlur }) => (
        <FormItem label="OHS initiative goal" name="goalTemplate" required>
          <Select
            aria-label="OHS initiative goal"
            ref={initiativeRef}
            inputId="goalTemplate"
            name="goalTemplate"
            className="usa-select"
            styles={selectOptionsReset}
            onChange={onChange}
            options={goalTemplates || []}
            placeholder="- Select -"
            value={value}
            getOptionLabel={(option) => option.name}
            getOptionValue={(option) => option.id}
            onBlur={onBlur}
          />
        </FormItem>
      )}
      name="goalTemplate"
      control={control}
      rules={rules}
      defaultValue={null}
    />
  );
}

GoalNudgeInitiativePicker.propTypes = {
  goalTemplates: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.number.isRequired,
    name: PropTypes.string.isRequired,
  })).isRequired,
  useOhsInitiativeGoal: PropTypes.bool.isRequired,
  // onSelectNudgedGoal: PropTypes.func.isRequired,
  initiativeRef: PropTypes.shape({
    current: PropTypes.instanceOf(Element),
  }).isRequired,
};
