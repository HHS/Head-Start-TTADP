import React, {
  useEffect, useMemo, useContext, useState,
} from 'react';
import PropTypes from 'prop-types';
import useDeepCompareEffect from 'use-deep-compare-effect';
import { useController, useFormContext } from 'react-hook-form';
import { DECIMAL_BASE } from '@ttahub/common';
import GoalText from '../../../../components/GoalForm/GoalText';
import { goalsByIdsAndActivityReport } from '../../../../fetchers/goals';
import Objectives from './Objectives';
import ConditionalFields from './ConditionalFieldsForHookForm';
import {
  GOAL_NAME_ERROR,
} from '../../../../components/GoalForm/constants';
import { NO_ERROR, ERROR_FORMAT } from './constants';
import AppLoadingContext from '../../../../AppLoadingContext';
import { combinePrompts } from '../../../../components/condtionalFieldConstants';
import FormFieldThatIsSometimesReadOnly from '../../../../components/GoalForm/FormFieldThatIsSometimesReadOnly';
import useGoalTemplatePrompts from '../../../../hooks/useGoalTemplatePrompts';

export default function GoalForm({
  goal,
  topicOptions,
  reportId,
  // templateResponses,
  // templatePrompts,
  // templateId,
  citationOptions,
  rawCitations,
  isMonitoringGoal,
}) {
  // console.log('template id passsed into goal form: ', templateId);
  // pull the errors out of the form context
  const { errors, watch } = useFormContext();

  // App Loading Context.
  const { isAppLoading, setAppLoadingText, setIsAppLoading } = useContext(AppLoadingContext);

  // This ensures we always have the prompts and responses for the template.
  const [templateResponses, templatePrompts] = useGoalTemplatePrompts(goal.goalTemplateId);

  /**
   * add controllers for all the controlled fields
   * react hook form uses uncontrolled fields by default
   * but we want to keep the logic in one place for the AR/RTR
   * if at all possible
   */

  const defaultName = useMemo(() => (goal && goal.name ? goal.name : ''), [goal]);
  const status = useMemo(() => (goal && goal.status ? goal.status : ''), [goal]);

  // activityRecipientId is the grantId for the goal.
  const activityRecipients = watch('activityRecipients');

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
    defaultValue: defaultName,
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

  // We need to combine responses for all grants that already have responses
  // and add prompts for any grants that don't have responses yet.
  const prompts = combinePrompts(
    goal.prompts,
    templateResponses,
    templatePrompts,
    activityRecipients,
  );

  const isCurated = goal.isCurated || false;

  return (
    <>
      <FormFieldThatIsSometimesReadOnly
        permissions={[
          !(goal.onApprovedAR),
          !isCurated,
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
        userCanEdit
        heading="Root cause"
      />

      <Objectives
        objectiveOptions={objectiveOptions}
        topicOptions={topicOptions}
        goalStatus={status}
        noObjectiveError={errors.goalForEditing && errors.goalForEditing.objectives
          ? ERROR_FORMAT(errors.goalForEditing.objectives.message) : NO_ERROR}
        reportId={parseInt(reportId, DECIMAL_BASE)}
        citationOptions={citationOptions}
        rawCitations={rawCitations}
        isMonitoringGoal={isMonitoringGoal}
      />
    </>
  );
}

GoalForm.propTypes = {
  goal: PropTypes.shape({
    goalTemplateId: PropTypes.number.isRequired,
    goalIds: PropTypes.arrayOf(PropTypes.number),
    value: PropTypes.oneOfType([
      PropTypes.number,
      PropTypes.string,
    ]),
    grantIds: PropTypes.arrayOf(PropTypes.number),
    oldGrantIds: PropTypes.arrayOf(PropTypes.number),
    label: PropTypes.string,
    name: PropTypes.string,
    isNew: PropTypes.bool,
    isCurated: PropTypes.bool,
    isSourceEditable: PropTypes.bool,
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
  citationOptions: PropTypes.arrayOf(PropTypes.shape({
    value: PropTypes.number,
    label: PropTypes.string,
  })),
  isMonitoringGoal: PropTypes.bool,
  rawCitations: PropTypes.arrayOf(PropTypes.shape({
    standardId: PropTypes.number,
    citation: PropTypes.string,
    // Create array of jsonb objects
    grants: PropTypes.arrayOf(PropTypes.shape({
      grantId: PropTypes.number,
      findingId: PropTypes.string,
      reviewName: PropTypes.string,
      grantNumber: PropTypes.string,
      reportDeliveryDate: PropTypes.string,
    })),
  })),
  reportId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  // templateId: PropTypes.number.isRequired,
  /*
  templatePrompts: PropTypes.oneOfType([
    PropTypes.bool,
    PropTypes.arrayOf(PropTypes.shape({
      type: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      prompt: PropTypes.string.isRequired,
      options: PropTypes.arrayOf(PropTypes.string).isRequired,
    })).isRequired,
  ]).isRequired,
  templateResponses: PropTypes.arrayOf(PropTypes.shape({
    type: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    prompt: PropTypes.string.isRequired,
    options: PropTypes.arrayOf(PropTypes.string).isRequired,
  })).isRequired,
  */
};

GoalForm.defaultProps = {
  citationOptions: [],
  rawCitations: [],
  isMonitoringGoal: false,
};
