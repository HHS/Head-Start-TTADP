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
    watch, control, setValue,
  } = useFormContext();
  const [newGoal, updateNewGoal] = useState('');
  const [newAvailableGoals, updateNewAvailableGoals] = useState([]);
  const selectedGoals = watch('goals');

  const onRemove = (id) => {
    const newGoals = selectedGoals.filter((selectedGoal) => selectedGoal.id !== id);
    updateNewAvailableGoals((goals) => goals.filter((goal) => goal !== id));
    setValue('goals', newGoals);
  };

  const onNewGoalChange = (e) => {
    updateNewGoal(e.target.value);
  };

  const addNewGoal = () => {
    if (newGoal !== '') {
      const goal = { id: newGoal, name: newGoal };
      setValue('goals', [...selectedGoals, goal]);
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
        <Label>
          Select an established goal(s)
          <MultiSelect
            name="goals"
            control={control}
            valueProperty="id"
            labelProperty="name"
            simple={false}
            components={components}
            rules={{
              validate: (goals) => {
                if (goals.length < 1) {
                  return 'Every report must have at least one goal';
                }

                const unfinishedGoals = goals.some((goal) => {
                  // Every goal must have an objective for the `goals` field has unfinished goals
                  if (goal.objectives && goal.objectives.length > 0) {
                    // Every objective for this goal has to have a title and ttaProvided
                    const objectivesUnfinished = goal.objectives.some(
                      (objective) => !(objective.title && objective.ttaProvided),
                    );
                    if (!objectivesUnfinished) {
                      return false;
                    }
                  }
                  // return true, this goal is unfinished
                  return true;
                });
                return unfinishedGoals ? 'Every goal requires at least one objective' : true;
              },
            }}
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
        <div>
          {selectedGoals.map((goal, index) => (
            <Goal
              key={goal.id}
              goalIndex={index}
              id={goal.id}
              onRemove={onRemove}
              name={goal.name}
            />
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
