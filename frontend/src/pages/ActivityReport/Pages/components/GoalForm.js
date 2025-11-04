import React, {
  useEffect, useMemo, useContext, useState,
} from 'react';
import PropTypes from 'prop-types';
import useDeepCompareEffect from 'use-deep-compare-effect';
import { useController, useFormContext } from 'react-hook-form';
import { DECIMAL_BASE } from '@ttahub/common';
import { getGoalTemplateObjectiveOptions } from '../../../../fetchers/goals';
import Objectives from './Objectives';
import ConditionalFields from './ConditionalFieldsForHookForm';
import {
  GOAL_NAME_ERROR,
} from '../../../../components/GoalForm/constants';
import { NO_ERROR, ERROR_FORMAT } from './constants';
import AppLoadingContext from '../../../../AppLoadingContext';
import { combinePrompts } from '../../../../components/condtionalFieldConstants';
import useGoalTemplatePrompts from '../../../../hooks/useGoalTemplatePrompts';
import ReadOnlyField from '../../../../components/ReadOnlyField';

export default function GoalForm({
  goal,
  topicOptions,
  reportId,
  citationOptions,
  rawCitations,
  isMonitoringGoal,
}) {
  // pull the errors out of the form context
  const { errors, watch } = useFormContext();

  // App Loading Context.
  const { setAppLoadingText, setIsAppLoading } = useContext(AppLoadingContext);

  // This ensures we always have the prompts and responses for the template.
  const [templateResponses, templatePrompts] = useGoalTemplatePrompts(
    goal.goalTemplateId,
    goal.goalIds,
    true, // isForActivityReport (looks like it is)
  );

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
      value: goalText,
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
  const [objectiveOptionsLoaded, setObjectiveOptionsLoaded] = useState(false);

  /*
   * this use effect fetches
   * associated goal data
   */
  useDeepCompareEffect(() => {
    let isMounted = true;

    async function fetchData() {
      try {
        if (isMounted) {
          setIsAppLoading(true);
          setAppLoadingText('Loading');
        }
        const allObjectiveOptions = await getGoalTemplateObjectiveOptions(
          reportId,
          goal.goalTemplateId,
        );
        if (isMounted) {
          setObjectiveOptions(allObjectiveOptions);
          setObjectiveOptionsLoaded(true);
          setIsAppLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setIsAppLoading(false);
        }
        throw err;
      }
    }

    if (goal.goalTemplateId) {
      fetchData();
    } else {
      setObjectiveOptions([]);
      setObjectiveOptionsLoaded(true); // Even though we didn't make the async call we are done.
    }

    return () => {
      isMounted = false;
    };
  }, [goal.goalIds, reportId, setAppLoadingText, setIsAppLoading]);

  // We need to combine responses for all grants that already have responses
  // and add prompts for any grants that don't have responses yet.
  const prompts = combinePrompts(
    goal.prompts,
    templateResponses,
    templatePrompts,
    activityRecipients,
  );

  return (
    <>
      <ReadOnlyField>
        {goalText}
      </ReadOnlyField>

      <ConditionalFields
        prompts={prompts}
        userCanEdit
        heading="Root cause"
        drawerButtonText="Get help choosing root causes"
        drawerTitle="Root causes"
        drawerTagName="ttahub-fei-root-causes"
        drawerClassName="ttahub-drawer--ttahub-fei-root-causes-guidance"
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
        objectiveOptionsLoaded={objectiveOptionsLoaded}
      />
    </>
  );
}

GoalForm.propTypes = {
  goal: PropTypes.shape({
    goalTemplateId: PropTypes.number,
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
};

GoalForm.defaultProps = {
  citationOptions: [],
  rawCitations: [],
  isMonitoringGoal: false,
};
