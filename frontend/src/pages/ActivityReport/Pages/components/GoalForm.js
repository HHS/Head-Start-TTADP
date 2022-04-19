import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { useFormContext } from 'react-hook-form/dist/index.ie11';
import GoalText from '../../../../components/GoalForm/GoalText';
import { goalById } from '../../../../fetchers/goals';
import Objectives from './Objectives';
import GoalDate from '../../../../components/GoalForm/GoalDate';
import { validateGoals } from './goalValidator';

export default function GoalForm({ goal, topicOptions }) {
  const {
    setValue,
  } = useFormContext();
  const [objectives, setObjectives] = useState([]);
  const { name } = goal;

  // fetch associated goal data
  useEffect(() => {
    async function fetchData() {
      const data = await goalById(goal.id.toString());
      setObjectives(data.objectives);
    }

    if (goal.id !== 'new') {
      fetchData();
    } else {
      setObjectives([]);
    }
  }, [goal.id]);

  const updateGoal = (field, value) => {
    const goalToUpdate = { ...goal };
    goalToUpdate[field] = value;
    setValue('goalForEditing', goalToUpdate);
  };

  const onUpdateText = (e) => {
    const newText = e.target.value;
    updateGoal('name', newText);
  };

  const onUpdateDate = (date) => {
    updateGoal('endDate', date);
  };

  const validateGoalName = () => {
    validateGoals([goal]);
  };

  const validateEndDate = () => {};

  return (
    <>
      <GoalText
        error={<></>}
        isOnReport={false}
        goalName={name}
        validateGoalName={validateGoalName}
        onUpdateText={onUpdateText}
      />

      { goal.value === 'new'
        ? (
          <GoalDate
            error={<></>}
            setEndDate={onUpdateDate}
            endDate={goal.endDate}
            validateEndDate={validateEndDate}
            datePickerKey="end-date-key"
          />
        )
        : null }

      <Objectives
        goal={goal}
        objectives={objectives}
        topicOptions={topicOptions}
      />
    </>
  );
}

GoalForm.propTypes = {
  goal: PropTypes.shape({
    id: PropTypes.number,
    value: PropTypes.number,
    label: PropTypes.string,
    name: PropTypes.string,
    endDate: PropTypes.string,
  }).isRequired,
  topicOptions: PropTypes.arrayOf(PropTypes.shape({
    value: PropTypes.number,
    label: PropTypes.string,
  })).isRequired,
};
