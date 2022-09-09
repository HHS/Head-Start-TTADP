import React, {
  useEffect, useState, useMemo, useContext,
} from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { v4 as uuid } from 'uuid';
import { useController, useFormContext } from 'react-hook-form/dist/index.ie11';
import GoalText from '../../../../components/GoalForm/GoalText';
import { goalsByIdsAndActivityReport } from '../../../../fetchers/goals';
import Objectives from './Objectives';
import GoalDate from '../../../../components/GoalForm/GoalDate';
import {
  GOAL_DATE_ERROR,
  GOAL_NAME_ERROR,
} from '../../../../components/GoalForm/constants';
import { NO_ERROR, ERROR_FORMAT } from './constants';
import Loader from '../../../../components/Loader';
import GoalFormContext from '../../../../GoalFormContext';

export default function GoalForm({
  goal,
  topicOptions,
  roles,
  reportId,
}) {
  // pull the errors out of the form context
  const { errors, watch } = useFormContext();

  // Goal Form Context.
  const { isLoading } = useContext(GoalFormContext);

  /**
   * add controllers for all the controlled fields
   * react hook form uses uncontrolled fields by default
   * but we want to keep the logic in one place for the AR/RTR
   * if at all possible
   */

  const defaultEndDate = useMemo(() => (goal && goal.endDate ? goal.endDate : ''), [goal]);
  const defaultName = useMemo(() => (goal && goal.name ? goal.name : ''), [goal]);

  // the date picker component, as always, presents special challenges, it needs a key updated
  // to re-render appropriately
  const [datePickerKey, setDatePickerKey] = useState(uuid());
  const activityRecipientType = watch('activityRecipientType');

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
        isValidDate: (value) => activityRecipientType === 'other-entity' || (
          (value && moment(value, 'MM/DD/YYYY').isValid())
        ) || GOAL_DATE_ERROR,
      },
    },
    defaultValue: defaultEndDate,
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
    rules: activityRecipientType === 'recipient' ? {
      required: {
        value: true,
        message: GOAL_NAME_ERROR,
      },
    } : {},
    defaultValue: defaultName,
  });

  // when the goal is updated in the selection, we want to update
  // the fields via the useController functions
  useEffect(() => {
    onUpdateText(goal.name ? goal.name : defaultName);

    const newEndDate = goal.endDate ? goal.endDate : defaultEndDate;
    onUpdateDate(newEndDate);
    setDatePickerKey(uuid());
  }, [
    defaultEndDate,
    defaultName,
    goal.endDate,
    goal.name,
    onUpdateDate,
    onUpdateText,
    setDatePickerKey,
  ]);

  const [objectives, setObjectives] = useState([]);

  /*
   * this use effect fetches
   * associated goal data
   */
  useEffect(() => {
    async function fetchData() {
      const data = await goalsByIdsAndActivityReport(goal.goalIds, reportId);
      setObjectives(data[0].objectives);
    }
    if (!goal.isNew && goal.goalIds) {
      fetchData();
    } else {
      setObjectives([]);
    }
  }, [goal.goalIds, goal.isNew, reportId]);

  return (
    <>
      <Loader loading={isLoading} loadingLabel="Loading" text="Saving" />
      <GoalText
        error={errors.goalName ? ERROR_FORMAT(errors.goalName.message) : NO_ERROR}
        goalName={goalText}
        validateGoalName={onBlurGoalText}
        onUpdateText={onUpdateText}
        inputName={goalTextInputName}
        isOnReport={goal.onApprovedAR || false}
        isLoading={isLoading}
      />

      <GoalDate
        error={errors.goalEndDate ? ERROR_FORMAT(errors.goalEndDate.message) : NO_ERROR}
        setEndDate={onUpdateDate}
        endDate={goalEndDate}
        validateEndDate={onBlurDate}
        datePickerKey={datePickerKey}
        inputName={goalEndDateInputName}
        isLoading={isLoading}
      />

      <Objectives
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
    onApprovedAR: PropTypes.bool,
  }).isRequired,
  topicOptions: PropTypes.arrayOf(PropTypes.shape({
    value: PropTypes.number,
    label: PropTypes.string,
  })).isRequired,
  roles: PropTypes.arrayOf(PropTypes.string).isRequired,
  reportId: PropTypes.number.isRequired,
};
