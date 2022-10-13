import React, {
  useEffect, useState, useMemo, useContext,
} from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { useController, useFormContext } from 'react-hook-form/dist/index.ie11';
import GoalText from '../../../../components/GoalForm/GoalText';
import { goalsByIdsAndActivityReport } from '../../../../fetchers/goals';
import Objectives from './Objectives';
import GoalDate from '../../../../components/GoalForm/GoalDate';
import {
  GOAL_DATE_ERROR,
  GOAL_NAME_ERROR,
  GOAL_RTTAPA_ERROR,
} from '../../../../components/GoalForm/constants';
import { NO_ERROR, ERROR_FORMAT } from './constants';
import Loader from '../../../../components/Loader';
import GoalFormContext from '../../../../GoalFormContext';
import { DECIMAL_BASE } from '../../../../Constants';
import GoalRttapa from '../../../../components/GoalForm/GoalRttapa';

export default function GoalForm({
  goal,
  topicOptions,
  roles,
  reportId,
  onSaveDraft,
  datePickerKey,
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
  const status = useMemo(() => (goal && goal.status ? goal.status : ''), [goal]);

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
    defaultValue: defaultEndDate || '',
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

  const {
    field: {
      onChange: onUpdateRttapa,
      onBlur: onBlurRttapa,
      value: isRttapa,
      name: goalIsRttapaInputName,
    },
  } = useController({
    name: 'goalIsRttapa',
    rules: {
      required: {
        value: true,
        message: GOAL_RTTAPA_ERROR,
      },
    },
    defaultValue: '',
  });

  // when the goal is updated in the selection, we want to update
  // the fields via the useController functions
  useEffect(() => {
    onUpdateText(goal.name ? goal.name : defaultName);
  }, [
    defaultName,
    goal.name,
    onUpdateText,
  ]);

  useEffect(() => {
    onUpdateRttapa(goal.isRttapa ? goal.isRttapa : '');
  }, [goal.isRttapa, onUpdateRttapa]);

  useEffect(() => {
    onUpdateDate(goal.endDate ? goal.endDate : defaultEndDate);
  }, [defaultEndDate, goal.endDate, onUpdateDate]);

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

    const shouldIFetchData = (
      goal.goalIds
      && (
        !goal.isNew || (
          goal.isNew
          && goal.oldGrantIds.filter((g) => g).length
        )
      )
    );

    if (shouldIFetchData) {
      fetchData();
    } else {
      setObjectives([]);
    }
  }, [goal.goalIds, goal.isNew, goal.oldGrantIds, reportId]);

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
        goalStatus={status}
        isLoading={isLoading}
      />

      <GoalRttapa
        error={errors.goalIsRttapa ? ERROR_FORMAT(errors.goalIsRttapa.message) : NO_ERROR}
        isRttapa={isRttapa}
        onChange={onUpdateRttapa}
        onBlur={onBlurRttapa}
        inputName={goalIsRttapaInputName}
        goalStatus={status}
        isOnApprovedReport={goal.onApprovedAR || false}
      />

      <GoalDate
        error={errors.goalEndDate ? ERROR_FORMAT(errors.goalEndDate.message) : NO_ERROR}
        setEndDate={onUpdateDate}
        endDate={goalEndDate || ''}
        validateEndDate={onBlurDate}
        key={datePickerKey} // force a re-render when the a new goal is picked
        inputName={goalEndDateInputName}
        goalStatus={status}
        isLoading={isLoading}
      />

      <Objectives
        objectives={objectives}
        topicOptions={topicOptions}
        roles={roles}
        goalStatus={status}
        noObjectiveError={errors.goalForEditing && errors.goalForEditing.objectives
          ? ERROR_FORMAT(errors.goalForEditing.objectives.message) : NO_ERROR}
        onSaveDraft={onSaveDraft}
        reportId={parseInt(reportId, DECIMAL_BASE)}
      />
    </>
  );
}

GoalForm.propTypes = {
  goal: PropTypes.shape({
    id: PropTypes.oneOfType([
      PropTypes.arrayOf(PropTypes.shape({
        value: PropTypes.number,
        label: PropTypes.string,
      })), PropTypes.string,
    ]).isRequired,
    goalIds: PropTypes.arrayOf(PropTypes.number).isRequired,
    value: PropTypes.oneOfType([
      PropTypes.number,
      PropTypes.string,
    ]),
    isRttapa: PropTypes.bool,
    oldGrantIds: PropTypes.arrayOf(PropTypes.number).isRequired,
    label: PropTypes.string,
    name: PropTypes.string,
    endDate: PropTypes.string,
    isNew: PropTypes.bool,
    onApprovedAR: PropTypes.bool,
    status: PropTypes.string,
  }).isRequired,
  topicOptions: PropTypes.arrayOf(PropTypes.shape({
    value: PropTypes.number,
    label: PropTypes.string,
  })).isRequired,
  roles: PropTypes.arrayOf(PropTypes.string).isRequired,
  reportId: PropTypes.number.isRequired,
  onSaveDraft: PropTypes.func.isRequired,
  datePickerKey: PropTypes.string.isRequired,
};
