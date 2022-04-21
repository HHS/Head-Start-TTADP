import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { useFormContext, useController } from 'react-hook-form/dist/index.ie11';
import GoalText from '../../../../components/GoalForm/GoalText';
import { goalById } from '../../../../fetchers/goals';
import Objectives from './Objectives';
import GoalDate from '../../../../components/GoalForm/GoalDate';
import { GOAL_ERROR_INDEXES } from './goalValidator';
import {
  GOAL_DATE_ERROR,
} from '../../../../components/GoalForm/constants';

const NO_ERROR = <></>;
// const NO_OBJECTIVES_ERROR = <span className="usa-error-message">{GOAL_MISSING_OBJECTIVE}</span>;
const GOAL_DATE_ERROR_MESSAGE = <span className="usa-error-message">{GOAL_DATE_ERROR}</span>;
// const GOAL_NAME_ERROR = <span className="usa-error-message">{GOAL_NAME}</span>;
export default function GoalForm({ goal, topicOptions }) {
  const { watch } = useFormContext();

  /**
   * add controllers for all the controlled fields
   * react hook form uses uncontrolled fields by default
   * but we want to keep the logic in one place for the AR/RTR
   * if at all possible
   */
  const {
    field: {
      onChange: onUpdateDate,
      onBlur: onBlurDate,
      value: goalEndDate,
      ref: goalDateRef,
      name: goalEndDateInputName,
    },
  } = useController({
    name: 'goalEndDate',
    rules: { required: true },
    defaultValue: goal.endDate,
  });

  const {
    field: {
      onChange: onUpdateText,
      onBlur: onBlurGoalText,
      value: goalText,
      ref: goalTextRef,
      name: goalTextInputName,
    },
  } = useController({
    name: 'goalText',
    rules: { required: true },
    defaultValue: goal.name,
  });

  const [objectives, setObjectives] = useState([]);
  // const [noObjectiveError, setNoObjectiveError] = useState(NO_ERROR);
  const [goalNameError, setGoalNameError] = useState(NO_ERROR);
  const [goalDateError, setGoalDateError] = useState(NO_ERROR);
  const goalErrors = watch('goalErrors');

  // /**
  //  * this use effect handles the doling out of errors
  //  * to each of the little error handlers
  //  */
  // useEffect(() => {
  //   const objectiveError = goalErrors && goalErrors[GOAL_ERROR_INDEXES.NO_OBJECTIVES]
  //     ? NO_OBJECTIVES_ERROR : NO_ERROR;
  //   setNoObjectiveError(objectiveError);

  //   const nameError = goalErrors && goalErrors[GOAL_ERROR_INDEXES.NAME]
  //     ? GOAL_NAME_ERROR : NO_ERROR;
  //   setGoalNameError(nameError);

  //   const dateError = goalErrors && goalErrors[GOAL_ERROR_INDEXES.END_DATE]
  //     ? GOAL_DATE_ERROR : NO_ERROR;
  //   setGoalDateError(dateError);
  // }, [goalErrors]);

  /*
   * this use effect fetches
   * associated goal data
   */
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

  /**
   * Sets the goal name errors on blur
   */
  const validateGoalName = () => {
    let error = NO_ERROR;
    if (!goal.name) {
      error = GOAL_DATE_ERROR;
    }
    setGoalNameError(error);
  };

  /**
   * sets the goal date errors on blur
   */
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
      {/* <input type="hidden" {...register('goalErrors')} /> */}

      <GoalText
        error={goalNameError}
        isOnReport={false}
        goalName={goalText}
        validateGoalName={validateGoalName}
        onUpdateText={onUpdateText}
        onBlur={onBlurGoalText}
        inputName={goalTextInputName}
        inputRef={goalTextRef}
      />

      { goal.value === 'new'
        ? (
          <GoalDate
            error={goalDateError}
            setEndDate={onUpdateDate}
            endDate={goalEndDate}
            validateEndDate={validateEndDate}
            datePickerKey="end-date-key"
            onBlur={onBlurDate}
            inputRef={goalDateRef}
            inputName={goalEndDateInputName}
          />
        )
        : null }

      <Objectives
        goal={goal}
        // noObjectiveError={noObjectiveError}
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
