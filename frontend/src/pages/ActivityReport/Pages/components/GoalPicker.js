import React, { useState } from 'react';
import { uniqBy, cloneDeep } from 'lodash';
import PropTypes from 'prop-types';
import {
  Button, Label, TextInput,
} from '@trussworks/react-uswds';
import { useFormContext, useWatch } from 'react-hook-form/dist/index.ie11';
import { v4 as uuidv4 } from 'uuid';

import FormItem from '../../../../components/FormItem';
import Goal from './Goal';
import MultiSelect from '../../../../components/MultiSelect';
import Option from './GoalOption';
import Input from './GoalInput';
import { validateGoals } from './goalValidator';

const components = {
  Input,
  Option,
};

const createObjective = () => ({
  title: '', ttaProvided: '', status: 'Not Started', id: uuidv4(), new: true,
});

const GoalPicker = ({
  availableGoals,
}) => {
  const {
    control, setValue,
  } = useFormContext();
  const [newGoal, updateNewGoal] = useState('');
  const [inMemoryGoals, updateInMemoryGoals] = useState([]);
  const selectedGoals = useWatch({ name: 'goals' });
  // availableGoals: goals passed into GoalPicker. getGoals returns GrantGoals
  // inMemoryGoals: unsaved goals, deselected goals
  // selectedGoals: goals selected by user in MultiSelect
  const allAvailableGoals = [...availableGoals, ...inMemoryGoals, ...selectedGoals];

  const onRemoveGoal = (id) => {
    const newGoals = selectedGoals.filter((selectedGoal) => selectedGoal.id !== id);
    updateInMemoryGoals(newGoals);
    setValue('goals', newGoals);
  };

  const onUpdateGoal = (index, name) => {
    if (name !== '') {
      const oldGoal = selectedGoals[index];
      const goal = {
        ...oldGoal,
        name,
      };
      const updatedGoals = cloneDeep(selectedGoals);
      updatedGoals[index] = goal;
      setValue('goals', updatedGoals);
    }
  };

  const onSaveGoal = () => {
    if (newGoal !== '') {
      const goal = {
        id: uuidv4(),
        new: true,
        name: newGoal,
        objectives: [createObjective()],
      };
      setValue('goals', [...selectedGoals, goal]);
      updateInMemoryGoals((oldGoals) => [...oldGoals, goal]);
      updateNewGoal('');
    }
  };

  const onUpdateObjectives = (index, objectives) => {
    const newGoals = cloneDeep(selectedGoals);
    newGoals[index].objectives = objectives;
    // When objecttives are added/updated, make sure they are attached to available goals
    updateInMemoryGoals(newGoals);
    setValue('goals', newGoals);
  };

  const onItemSelected = (event) => {
    // Use selections from MultiSelect to update goals form state
    const newlySelectedGoals = event.map((e) => {
      const goal = allAvailableGoals.find((g) => g.id === e.value);
      let objectives = [createObjective()];

      if (goal.objectives && goal.objectives.length > 0) {
        objectives = goal.objectives;
      }
      return {
        ...goal,
        objectives,
      };
    });
    // Preserve deselected goals so they can be re-reselected
    const selectedIds = event.map((g) => g.id);
    const deselectedGoals = selectedGoals.filter((g) => !selectedIds.includes(g.id));
    updateInMemoryGoals([...inMemoryGoals, ...deselectedGoals]);

    setValue('goals', newlySelectedGoals);
  };

  const onNewGoalChange = (e) => {
    updateNewGoal(e.target.value);
  };

  const uniqueAvailableGoals = uniqBy(allAvailableGoals, 'id');

  return (
    <div className="margin-top-4">
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
            onItemSelected={onItemSelected}
            rules={{
              validate: validateGoals,
            }}
            options={uniqueAvailableGoals.map((goal) => ({ value: goal.id, label: goal.name }))}
            singleRowInput
            multiSelectOptions={{
              isClearable: false,
              closeMenuOnSelect: true,
              controlShouldRenderValue: false,
              hideSelectedOptions: false,
            }}
          />
        </Label>
        <Label>
          Create a new goal
          <TextInput value={newGoal} onChange={onNewGoalChange} />
        </Label>
        <Button type="button" onClick={onSaveGoal}>
          Save Goal
        </Button>
        <div>
          {selectedGoals.map((goal, index) => (
            <Goal
              key={goal.id}
              goalIndex={index}
              id={goal.id}
              objectives={goal.objectives}
              name={goal.name}
              isEditable={goal.new === true}
              createObjective={createObjective}
              onRemoveGoal={() => onRemoveGoal(goal.id)}
              onUpdateObjectives={(newObjectives) => {
                onUpdateObjectives(index, newObjectives);
              }}
              onUpdateGoal={(goalName) => onUpdateGoal(index, goalName)}
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
