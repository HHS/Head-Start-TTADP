import React, { useEffect, useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { useController, useFormContext } from 'react-hook-form/dist/index.ie11';
import GoalText from '../../../../components/GoalForm/GoalText';
import { goalsByIds } from '../../../../fetchers/goals';
import Objectives from './Objectives';
import GoalDate from '../../../../components/GoalForm/GoalDate';
import {
  GOAL_DATE_ERROR,
  GOAL_NAME_ERROR,
} from '../../../../components/GoalForm/constants';
import { NO_ERROR, ERROR_FORMAT } from './constants';

export default function GoalForm({
  goal,
  topicOptions,
  roles,
}) {
  // pull the errors out of the form context
  const { errors } = useFormContext();

  // memoize whether or not the end date is required, so we only
  // do it when the goal changes from new to not new
  const endDateRequired = useMemo(() => goal.isNew, [goal.isNew]);

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
      name: goalEndDateInputName,
    },
  } = useController({
    name: 'goalEndDate',
    rules: {
      validate: {
        isValidDate: (value) => (
          !endDateRequired || (value && moment(value, 'MM/DD/YYYY').isValid())
        ) || GOAL_DATE_ERROR,
      },
    },
    defaultValue: goal && goal.endDate ? goal.endDate : ' ',
  });

  const {
    field: {
      onChange: onUpdateText,
      onBlur: onBlurGoalText,
      value: goalText,
      name: goalTextInputName,
    },
  } = useController({
    name: 'goalName',
    rules: {
      required: {
        value: true,
        message: GOAL_NAME_ERROR,
      },
    },
    defaultValue: goal && goal.name ? goal.name : '',
  });

  // when the goal is updated in the selection, we want to update
  // the fields via the useController functions
  useEffect(() => {
    onUpdateText(goal.name);
    onUpdateDate(goal.endDate);
  }, [goal.endDate, goal.name, onUpdateDate, onUpdateText]);

  const [objectives, setObjectives] = useState([]);

  /*
   * this use effect fetches
   * associated goal data
   */
  useEffect(() => {
    async function fetchData() {
      const data = await goalsByIds(goal.goalIds);
      setObjectives(data[0].objectives);
    }
    if (!goal.isNew && goal.goalIds) {
      fetchData();
    } else {
      setObjectives([]);
    }
  }, [goal.goalIds, goal.isNew]);

  return (
    <>
      <GoalText
        error={errors.goalName ? ERROR_FORMAT(errors.goalName.message) : NO_ERROR}
        isOnReport={false}
        goalName={goalText}
        validateGoalName={onBlurGoalText}
        onUpdateText={onUpdateText}
        inputName={goalTextInputName}
      />
      { endDateRequired
        ? (
          <GoalDate
            error={errors.goalEndDate ? ERROR_FORMAT(errors.goalEndDate.message) : NO_ERROR}
            setEndDate={onUpdateDate}
            endDate={goalEndDate}
            validateEndDate={onBlurDate}
            datePickerKey="end-date-key"
            inputName={goalEndDateInputName}
          />
        )
        : null }
      <Objectives
        goalId={goal.id}
        objectives={objectives}
        topicOptions={topicOptions}
        roles={roles}
        noObjectiveError={errors.goalForEditing && errors.goalForEditing.objectives
          ? ERROR_FORMAT(errors.goalForEditing.objectives.message) : NO_ERROR}
      />
    </>
  );
}

GoalForm.propTypes = {
  goal: PropTypes.shape({
    id: PropTypes.arrayOf(PropTypes.shape({
      value: PropTypes.number,
      label: PropTypes.string,
    })).isRequired,
    goalIds: PropTypes.arrayOf(PropTypes.number).isRequired,
    value: PropTypes.oneOfType([
      PropTypes.number,
      PropTypes.string,
    ]),
    label: PropTypes.string,
    name: PropTypes.string,
    endDate: PropTypes.string,
    isNew: PropTypes.bool,
  }).isRequired,
  topicOptions: PropTypes.arrayOf(PropTypes.shape({
    value: PropTypes.number,
    label: PropTypes.string,
  })).isRequired,
  roles: PropTypes.arrayOf(PropTypes.string).isRequired,
};
