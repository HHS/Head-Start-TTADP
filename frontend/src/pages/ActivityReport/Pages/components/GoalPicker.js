import React from 'react';
import PropTypes from 'prop-types';
import { useFormContext } from 'react-hook-form';

import Goal from './Goal';
import MultiSelect from '../../../../components/MultiSelect';
import Option from './GoalOption';
import Input from './GoalInput';

const components = {
  Input,
  Option,
};

const GoalPicker = ({
  availableGoals, selectedGoals,
}) => {
  const { setValue, control } = useFormContext();
  const onRemove = (id) => {
    const newGoals = selectedGoals.filter((selectedGoal) => selectedGoal.id !== id);
    setValue('goals', newGoals);
  };

  return (
    <>
      <div>
        <MultiSelect
          name="goals"
          label="Goal(s) for this activity. select an established goal or create a new one."
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
                  // If any of the objectives for this goal are being edited the `goals` field has
                  // unfinished goals

                  const objectivesEditing = goal.objectives.some((objective) => objective.edit);
                  if (!objectivesEditing) {
                    return false;
                  }
                }
                // return true, this goal is unfinished
                return true;
              });
              return unfinishedGoals ? 'Every goal requires at least one objective' : true;
            },
          }}
          options={availableGoals.map((goal) => ({ value: goal.id, label: goal.name }))}
          multiSelectOptions={{
            isClearable: false,
            closeMenuOnSelect: false,
            controlShouldRenderValue: false,
            hideSelectedOptions: false,
          }}
        />
      </div>
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
    </>
  );
};

GoalPicker.propTypes = {
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
