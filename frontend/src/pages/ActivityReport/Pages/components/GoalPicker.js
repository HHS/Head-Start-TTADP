import React from 'react';
import PropTypes from 'prop-types';

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
        {selectedGoals.map((goal) => (
          <Goal key={goal.id} id={goal.id} onRemove={onRemove} name={goal.name} />
        ))}
      </div>
    </>
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
