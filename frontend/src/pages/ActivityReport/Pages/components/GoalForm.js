import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { useFormContext } from 'react-hook-form/dist/index.ie11';
import GoalText from '../../../../components/GoalForm/GoalText';
import { goalById } from '../../../../fetchers/goals';
import Objectives from './Objectives';
import GoalDate from '../../../../components/GoalForm/GoalDate';
import { GOAL_NAME, GOAL_ERROR_INDEXES } from './goalValidator';
import {
  GOAL_DATE_ERROR,
} from '../../../../components/GoalForm/constants';

const NO_ERROR = <></>;
const GOAL_DATE_ERROR_MESSAGE = <span className="usa-error-message">{GOAL_DATE_ERROR}</span>;
const GOAL_NAME_ERROR = <span className="usa-error-message">{GOAL_NAME}</span>;
export default function GoalForm({ goal, topicOptions }) {
  const {
    setValue, register, watch,
  } = useFormContext();
  const [objectives, setObjectives] = useState([]);
  const [goalNameError, setGoalNameError] = useState(NO_ERROR);
  const [goalDateError, setGoalDateError] = useState(NO_ERROR);
  const goalErrors = watch('goalErrors');
  const { name } = goal;

  useEffect(() => {
    const nameError = goalErrors && goalErrors[GOAL_ERROR_INDEXES.NAME]
      ? GOAL_NAME_ERROR : NO_ERROR;
    setGoalNameError(nameError);

    const dateError = goalErrors && goalErrors[GOAL_ERROR_INDEXES.END_DATE]
      ? GOAL_DATE_ERROR : NO_ERROR;
    setGoalDateError(dateError);
  }, [goalErrors]);

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
    let error = NO_ERROR;
    if (!goal.name) {
      error = GOAL_DATE_ERROR;
    }
    setGoalNameError(error);
  };

  const validateEndDate = () => {
    let error = NO_ERROR;
    if (goal.id === 'new' && !goal.endDate) {
      error = GOAL_DATE_ERROR_MESSAGE;
    }
    setGoalDateError(error);
  };

  return (
    <>
      {/* eslint-disable-next-line react/jsx-props-no-spreading */}
      <input type="hidden" {...register('goalErrors')} />

      <GoalText
        error={goalNameError}
        isOnReport={false}
        goalName={name}
        validateGoalName={validateGoalName}
        onUpdateText={onUpdateText}
      />

      { goal.value === 'new'
        ? (
          <GoalDate
            error={goalDateError}
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
        objectiveErrors={goalErrors ? goalErrors[GOAL_ERROR_INDEXES.OBJECTIVES] : []}
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
