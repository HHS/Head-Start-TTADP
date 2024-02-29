import React, {
  useEffect, useMemo, useContext, useState,
} from 'react';
import PropTypes from 'prop-types';
import useDeepCompareEffect from 'use-deep-compare-effect';
import moment from 'moment';
import { useController, useFormContext } from 'react-hook-form';
import { DECIMAL_BASE } from '@ttahub/common';
import GoalText from '../../../../components/GoalForm/GoalText';
import { goalsByIdsAndActivityReport } from '../../../../fetchers/goals';
import Objectives from './Objectives';
import GoalDate from '../../../../components/GoalForm/GoalDate';
import ConditionalFields from './ConditionalFieldsForHookForm';
import {
  GOAL_DATE_ERROR,
  GOAL_NAME_ERROR,
} from '../../../../components/GoalForm/constants';
import { NO_ERROR, ERROR_FORMAT } from './constants';
import AppLoadingContext from '../../../../AppLoadingContext';
import { combinePrompts } from '../../../../components/condtionalFieldConstants';
import GoalSource from '../../../../components/GoalForm/GoalSource';
import FormFieldThatIsSometimesReadOnly from '../../../../components/GoalForm/FormFieldThatIsSometimesReadOnly';

export default function GoalForm({
  goal,
  topicOptions,
  reportId,
  datePickerKey,
  templatePrompts,
  isMultiRecipientReport,
}) {
  // pull the errors out of the form context
  const { errors, watch } = useFormContext();

  // App Loading Context.
  const { isAppLoading, setAppLoadingText, setIsAppLoading } = useContext(AppLoadingContext);

  /**
   * add controllers for all the controlled fields
   * react hook form uses uncontrolled fields by default
   * but we want to keep the logic in one place for the AR/RTR
   * if at all possible
   */

  const defaultEndDate = useMemo(() => (goal && goal.endDate ? goal.endDate : ''), [goal]);
  const defaultName = useMemo(() => (goal && goal.name ? goal.name : ''), [goal]);
  const status = useMemo(() => (goal && goal.status ? goal.status : ''), [goal]);
  const defaultSource = useMemo(() => (goal && goal.source ? goal.source : ''), [goal]);

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
          (value && moment(value, 'MM/DD/YYYY').isValid()) || value === ''
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
      onChange: onUpdateGoalSource,
      onBlur: onBlurGoalSource,
      value: goalSource,
      name: goalSourceInputName,
    },
  } = useController({
    name: 'goalSource',
    rules: activityRecipientType === 'recipient' ? {
      required: {
        value: true,
        message: 'Select a goal source',
      },
    } : {},
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
    onUpdateDate(goal.endDate ? goal.endDate : defaultEndDate);
  }, [defaultEndDate, goal.endDate, onUpdateDate]);

  useEffect(() => {
    onUpdateGoalSource(goal.source ? goal.source : defaultSource);
  }, [goal.source, onUpdateGoalSource, defaultSource]);

  // objectives for the objective select, blood for the blood god, etc
  const [objectiveOptions, setObjectiveOptions] = useState([]);

  /*
   * this use effect fetches
   * associated goal data
   */
  useDeepCompareEffect(() => {
    async function fetchData() {
      try {
        setIsAppLoading(true);
        setAppLoadingText('Loading');
        const data = await goalsByIdsAndActivityReport(goal.goalIds, reportId);
        setObjectiveOptions(data[0].objectives);
      } finally {
        setIsAppLoading(false);
      }
    }

    if (goal.goalIds.length) {
      fetchData();
    } else {
      setObjectiveOptions([]);
    }
  }, [goal.goalIds, reportId, setAppLoadingText, setIsAppLoading]);

  const prompts = combinePrompts(templatePrompts, goal.prompts);
  const isCurated = goal.isCurated || false;

  return (
    <>
      <FormFieldThatIsSometimesReadOnly
        permissions={[
          !(goal.onApprovedAR),
          !isCurated,
          status !== 'Closed',
        ]}
        label="Recipient's goal"
        value={goalText}
      >
        <GoalText
          error={errors.goalName ? ERROR_FORMAT(errors.goalName.message) : NO_ERROR}
          goalName={goalText}
          validateGoalName={onBlurGoalText}
          onUpdateText={onUpdateText}
          inputName={goalTextInputName}
          isOnReport={goal.onApprovedAR || false}
          goalStatus={status}
          isLoading={isAppLoading}
        />
      </FormFieldThatIsSometimesReadOnly>

      <ConditionalFields
        prompts={prompts}
        isMultiRecipientReport={isMultiRecipientReport}
        userCanEdit
      />

      <FormFieldThatIsSometimesReadOnly
        permissions={[
          !isCurated,
          status !== 'Closed',
          goal.createdVia !== 'tr',
        ]}
        label="Goal source"
        value={goalSource}
      >
        <GoalSource
          error={errors.goalSource ? ERROR_FORMAT(errors.goalSource.message) : NO_ERROR}
          source={goalSource}
          validateGoalSource={onBlurGoalSource}
          onChangeGoalSource={onUpdateGoalSource}
          inputName={goalSourceInputName}
          goalStatus={status}
          isLoading={isAppLoading}
          userCanEdit={!isCurated}
          isOnReport={false}
          isMultiRecipientGoal={isMultiRecipientReport}
          createdViaTr={goal.createdVia === 'tr'}
        />
      </FormFieldThatIsSometimesReadOnly>

      <GoalDate
        error={errors.goalEndDate ? ERROR_FORMAT(errors.goalEndDate.message) : NO_ERROR}
        setEndDate={onUpdateDate}
        endDate={goalEndDate || ''}
        validateEndDate={onBlurDate}
        key={datePickerKey} // force a re-render when the a new goal is picked
        inputName={goalEndDateInputName}
        goalStatus={status}
        isLoading={isAppLoading}
        userCanEdit
      />

      <Objectives
        objectiveOptions={objectiveOptions}
        topicOptions={topicOptions}
        goalStatus={status}
        noObjectiveError={errors.goalForEditing && errors.goalForEditing.objectives
          ? ERROR_FORMAT(errors.goalForEditing.objectives.message) : NO_ERROR}
        reportId={parseInt(reportId, DECIMAL_BASE)}
      />
    </>
  );
}

GoalForm.propTypes = {
  goal: PropTypes.shape({
    goalIds: PropTypes.arrayOf(PropTypes.number),
    value: PropTypes.oneOfType([
      PropTypes.number,
      PropTypes.string,
    ]),
    oldGrantIds: PropTypes.arrayOf(PropTypes.number),
    label: PropTypes.string,
    name: PropTypes.string,
    endDate: PropTypes.string,
    isNew: PropTypes.bool,
    isCurated: PropTypes.bool,
    onApprovedAR: PropTypes.bool,
    status: PropTypes.string,
    source: PropTypes.string,
    createdVia: PropTypes.string,
    prompts: PropTypes.arrayOf(PropTypes.shape({
      type: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      prompt: PropTypes.string.isRequired,
      options: PropTypes.arrayOf(PropTypes.string).isRequired,
    }.isRequired)),
  }).isRequired,
  topicOptions: PropTypes.arrayOf(PropTypes.shape({
    value: PropTypes.number,
    label: PropTypes.string,
  })).isRequired,
  reportId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  datePickerKey: PropTypes.string.isRequired,
  templatePrompts: PropTypes.oneOfType([
    PropTypes.bool,
    PropTypes.arrayOf(PropTypes.shape({
      type: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      prompt: PropTypes.string.isRequired,
      options: PropTypes.arrayOf(PropTypes.string).isRequired,
    })).isRequired,
  ]).isRequired,
  isMultiRecipientReport: PropTypes.bool,
};

GoalForm.defaultProps = {
  isMultiRecipientReport: false,
};
