import React, { useState } from 'react';
import { uniqBy } from 'lodash';
import PropTypes from 'prop-types';
import {
  Button, Label, TextInput, Fieldset,
} from '@trussworks/react-uswds';

import Goal from './Goal';
import MultiSelect from '../../../../components/MultiSelect';

import Option from './GoalOption';
import Input from './GoalInput';

const components = {
  Input,
  Option,
};

const GoalPicker = ({
  control, availableGoals, selectedGoals, setValue,
}) => {
  const [newGoal, updateNewGoal] = useState('');
  const [newAvailableGoals, updateNewAvailableGoals] = useState([]);

  const onRemove = (id) => {
    const newGoals = selectedGoals.filter((selectedGoal) => selectedGoal.id !== id);
    updateNewAvailableGoals((goals) => goals.filter((goal) => goal !== id));
    setValue('goals', newGoals);
  };

  const onNewGoalChange = (e) => {
    updateNewGoal(e.target.value);
  };

  const addNewGoal = () => {
    const goal = { id: newGoal, name: newGoal };
    setValue('goals', [...selectedGoals, goal]);
    updateNewAvailableGoals((oldGoals) => [...oldGoals, goal]);
    updateNewGoal('');
  };

  const allAvailableGoals = [...availableGoals, ...newAvailableGoals, ...selectedGoals];
  const uniqueAvailableGoals = uniqBy(allAvailableGoals, 'id');

  return (
    <div className="smart-hub--form-section">
      <Fieldset unstyled>
        <legend>
          You must select an established goal(s) OR create a new goal for this activity.
        </legend>
        <div>
          <MultiSelect
            name="goals"
            label="Select an established goal(s)"
            control={control}
            valueProperty="id"
            labelProperty="name"
            simple={false}
            components={components}
            options={uniqueAvailableGoals.map((goal) => ({ value: goal.id, label: goal.name }))}
            multiSelectOptions={{
              isClearable: false,
              closeMenuOnSelect: false,
              controlShouldRenderValue: false,
              hideSelectedOptions: false,
            }}
          />
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
      </Fieldset>
    </div>
  );
};

GoalPicker.propTypes = {
  // eslint-disable-next-line react/forbid-prop-types
  control: PropTypes.object.isRequired,
  setValue: PropTypes.func.isRequired,
  availableGoals: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string,
      value: PropTypes.number,
    }),
  ).isRequired,
  selectedGoals: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string,
      value: PropTypes.number,
    }),
  ).isRequired,
};

export default GoalPicker;
