import React, { useState } from 'react';
import { uniqBy } from 'lodash';
import PropTypes from 'prop-types';
import {
  Button, Label, TextInput,
} from '@trussworks/react-uswds';
import { useFormContext } from 'react-hook-form';

import FormItem from '../../../../components/FormItem';
import Goal from './Goal';
import MultiSelect from '../../../../components/MultiSelect';

import Option from './GoalOption';
import Input from './GoalInput';

const components = {
  Input,
  Option,
};

const GoalPicker = ({
  availableGoals,
}) => {
  const {
    watch, control, setValue, trigger,
  } = useFormContext();
  const [newGoal, updateNewGoal] = useState('');
  const [newAvailableGoals, updateNewAvailableGoals] = useState([]);
  const selectedGoals = watch('goals');

  const onRemove = (id) => {
    const newGoals = selectedGoals.filter((selectedGoal) => selectedGoal.id !== id);
    updateNewAvailableGoals((goals) => goals.filter((goal) => goal !== id));
    setValue('goals', newGoals);
    trigger('goals');
  };

  const onNewGoalChange = (e) => {
    updateNewGoal(e.target.value);
  };

  const addNewGoal = () => {
    if (newGoal !== '') {
      const goal = { id: newGoal, name: newGoal };
      setValue('goals', [...selectedGoals, goal]);
      trigger('goals');
      updateNewAvailableGoals((oldGoals) => [...oldGoals, goal]);
      updateNewGoal('');
    }
  };

  const allAvailableGoals = [...availableGoals, ...newAvailableGoals, ...selectedGoals];
  const uniqueAvailableGoals = uniqBy(allAvailableGoals, 'id');

  return (
    <div className="smart-hub--form-section">
      <FormItem
        label="You must select an established goal(s) OR create a new goal for this activity."
        name="goals"
        fieldSetWrapper
      >
        <div>
          <Label>
            Select an established goal(s)
            <MultiSelect
              name="goals"
              control={control}
              valueProperty="id"
              labelProperty="name"
              simple={false}
              components={components}
              required="Please select an existing goal or create a new goal"
              options={uniqueAvailableGoals.map((goal) => ({ value: goal.id, label: goal.name }))}
              multiSelectOptions={{
                isClearable: false,
                closeMenuOnSelect: false,
                controlShouldRenderValue: false,
                hideSelectedOptions: false,
              }}
            />
          </Label>
          <Label>
            Create a new goal
            <TextInput value={newGoal} onChange={onNewGoalChange} />
          </Label>
          <Button type="button" onClick={addNewGoal}>
            Save Goal
          </Button>
        </div>
        <div>
          {selectedGoals.map((goal) => (
            <Goal key={goal.id} id={goal.id} onRemove={onRemove} name={goal.name} />
          ))}
        </div>
      </FormItem>
    </div>
  );
};

GoalPicker.propTypes = {
  availableGoals: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string,
      value: PropTypes.number,
    }),
  ).isRequired,
};

export default GoalPicker;
