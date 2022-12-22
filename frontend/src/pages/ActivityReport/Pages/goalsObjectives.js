/* eslint-disable react/jsx-props-no-spreading */
// disabling prop spreading to use the "register" function from react hook form the same
// way they did in thier examples
/* eslint-disable arrow-body-style */
import React, { useState, useContext } from 'react';
import moment from 'moment';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet';
import { Alert, Fieldset } from '@trussworks/react-uswds';
import useDeepCompareEffect from 'use-deep-compare-effect';
import { useFormContext, useController } from 'react-hook-form/dist/index.ie11';
import { Link } from 'react-router-dom';
import GoalPicker from './components/GoalPicker';
import { getGoals, setGoalAsActivelyEdited } from '../../../fetchers/activityReports';
import { validateGoals } from './components/goalValidator';
import RecipientReviewSection from './components/RecipientReviewSection';
import OtherEntityReviewSection from './components/OtherEntityReviewSection';
import { validateObjectives } from './components/objectiveValidator';
import ConnectionError from './components/ConnectionError';
import ReadOnly from '../../../components/GoalForm/ReadOnly';
import PlusButton from '../../../components/GoalForm/PlusButton';
import OtherEntity from './components/OtherEntity';
import GoalFormContext from '../../../GoalFormContext';
import ReadOnlyOtherEntityObjectives from '../../../components/GoalForm/ReadOnlyOtherEntityObjectives';

const GoalsObjectives = ({
  reportId,
  onSaveDraftOetObjectives,
}) => {
  const {
    watch, setValue, getValues, setError,
  } = useFormContext();

  const {
    isGoalFormClosed,
    isObjectivesFormClosed,
    toggleGoalForm,
    toggleObjectiveForm,
  } = useContext(GoalFormContext);

  const activityRecipientType = watch('activityRecipientType');
  const activityRecipients = watch('activityRecipients');
  const objectivesWithoutGoals = watch('objectivesWithoutGoals');
  const activityReportId = watch('id');
  const isRecipientReport = activityRecipientType === 'recipient';
  const isOtherEntityReport = activityRecipientType === 'other-entity';
  const grantIds = isRecipientReport ? activityRecipients.map((r) => {
    if (r.grant) {
      return r.grant.id;
    }

    return r.activityRecipientId;
  }) : [];
  const activityRecipientIds = activityRecipients.map((r) => r.activityRecipientId);

  const [fetchError, setFetchError] = useState(false);
  const [availableGoals, updateAvailableGoals] = useState([]);
  const hasGrants = grantIds.length > 0;

  const {
    field: {
      onChange: onUpdateGoals,
      value: selectedGoals,
    },
  } = useController({
    name: 'goals',
    rules: {
      validate: {
        validateGoals,
      },
    },
    defaultValue: [],
  });

  useDeepCompareEffect(() => {
    const fetch = async () => {
      try {
        if (isRecipientReport && hasGrants) {
          const fetchedGoals = await getGoals(grantIds);
          const formattedGoals = fetchedGoals.map((g) => {
            // if the goal is on an "old" grant, we should
            // treat it like a new goal for now
            let isNew = false;

            if (grantIds.some((id) => g.grantIds.includes(id))) {
              isNew = true;
            }

            return { ...g, isNew, grantIds };
          });
          updateAvailableGoals(formattedGoals);
        }

        setFetchError(false);
      } catch (error) {
        setFetchError(true);
      }
    };
    fetch();
  }, [grantIds]);

  const showGoals = isRecipientReport && hasGrants;

  const addNewGoal = () => {
    toggleGoalForm(false);
    // An empty value here means that the Select dropdown will show its placeholder.
    setValue('goalForEditing', null);

    // newGoal(grantIds) is still passed to the dropdown as part of the `options` prop,
    // so 'create a new goal' will still be an option.
  };

  const onRemove = (goal) => {
    const goalId = goal.id;
    const copyOfSelectedGoals = selectedGoals.map((g) => ({ ...g }));
    const index = copyOfSelectedGoals.findIndex((g) => g.id === goalId);

    if (index !== -1) {
      copyOfSelectedGoals.splice(index, 1);
    }

    onUpdateGoals(copyOfSelectedGoals);

    // if we have no goals, open the form up via the
    // hander provided by the context
    if (copyOfSelectedGoals.length === 0) {
      setValue('goalForEditing', '');
      setValue('goalName', '');
      setValue('goalEndDate', '');
      setValue('goalIsRttapa', '');
      toggleGoalForm(false);
    }
  };

  const onEdit = async (goal) => {
    try {
      await setGoalAsActivelyEdited(activityReportId, goal.goalIds);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('failed to set goal as actively edited with this error:', err);
    }

    try {
      const currentlyEditing = getValues('goalForEditing') ? { ...getValues('goalForEditing') } : null;
      console.log({ currentlyEditing });
      if (currentlyEditing) {
        const goalForEditingObjectives = getValues('goalForEditing.objectives') ? [...getValues('goalForEditing.objectives')] : [];
        const name = getValues('goalName');
        const endDate = getValues('goalEndDate');
        const isRttapa = getValues('goalIsRttapa');
        const areGoalsValid = validateGoals(
          [{
            ...currentlyEditing,
            name,
            endDate,
            isRttapa,
            objectives: goalForEditingObjectives,
          }],
          setError,
        );

        console.log({ areGoalsValid });

        if (areGoalsValid !== true) {
          return;
        }
      }

      // clear out the existing value (we need to do this because without it
      // certain objective fields don't clear out)
      setValue('goalForEditing', null);

      // make this goal the editable goal
      setValue('goalForEditing', goal);

      // setValue('goalForEditing.objectives', objectives);
      setValue('goalEndDate', moment(goal.endDate, 'YYYY-MM-DD').format('MM/DD/YYYY'));
      setValue('goalName', goal.name);

      const rttapaValue = goal.isRttapa;
      setValue('goalIsRttapa', rttapaValue);

      console.log({ goal, message: 'about to toggle goal form' });
      toggleGoalForm(false);

      let copyOfSelectedGoals = selectedGoals.map((g) => ({ ...g }));
      if (currentlyEditing) {
        copyOfSelectedGoals.push(currentlyEditing);
      }

      // remove the goal from the "selected goals"
      copyOfSelectedGoals = copyOfSelectedGoals.filter((g) => g.id !== goal.id);

      onUpdateGoals(copyOfSelectedGoals);
    } catch (err) {
      console.log({ err });
    }
  };

  // the read only component expects things a little differently
  const goalsForReview = selectedGoals.map((goal) => {
    return {
      ...goal,
      goalName: goal.name,
      grants: [],
    };
  });

  const oeObjectiveEdit = (objectives) => {
    const recipientIds = activityRecipients.map((ar) => ar.activityRecipientId);
    const objectivesForEdit = objectives.map((obj) => (
      {
        ...obj,
        recipientIds, // We need the other-entity ids to save on BE.
      }));
    setValue('objectivesWithoutGoals', objectivesForEdit);
    toggleObjectiveForm(false);
  };

  return (
    <>
      <Helmet>
        <title>Goals and objectives</title>
      </Helmet>

      {(!isOtherEntityReport && !isRecipientReport) && (
        <Alert noIcon type="info">
          To add goals and objectives, indicate who the activity was for in
          {' '}
          <Link to={`/activity-reports/${activityReportId}/activity-summary`}>Activity Summary</Link>
          .
        </Alert>
      )}

      {/**
        * on non-recipient reports, only objectives are shown
      */}
      {!isRecipientReport && isOtherEntityReport && !isObjectivesFormClosed
      && (
      <OtherEntity
        recipientIds={activityRecipientIds}
        onSaveDraft={onSaveDraftOetObjectives}
        reportId={reportId}
      />
      )}
      {/**
        * on other-entity, read only objective view.
      */}
      {!isRecipientReport
        && isObjectivesFormClosed
        // && objectivesWithoutGoals
        && objectivesWithoutGoals.length
        ? (
          <ReadOnlyOtherEntityObjectives
            onEdit={oeObjectiveEdit}
            objectives={objectivesWithoutGoals}
          />
        )
        : null}

      {(isRecipientReport && !showGoals) && (
      <Alert type="info" noIcon>
        <p className="usa-prose">To create goals, first select a recipient.</p>
      </Alert>
      )}

      {/**
        * all goals for review
      */}
      { goalsForReview.length ? (
        <ReadOnly
          onEdit={onEdit}
          onRemove={onRemove}
          createdGoals={goalsForReview}
        />
      ) : null }

      {/**
        * conditionally show the goal picker
      */}

      {showGoals && !isGoalFormClosed
        ? (
          <>
            <h3 className="margin-bottom-0 margin-top-4">Goal summary</h3>
            { fetchError && (<ConnectionError />)}
            <Fieldset className="margin-0">
              <GoalPicker
                grantIds={grantIds}
                availableGoals={availableGoals}
                reportId={reportId}
              />
            </Fieldset>
          </>
        ) : (
          null
        ) }

      {/**
        * we show the add new goal button if we are reviewing existing goals
        * and if the report HAS goals
        */}
      {showGoals && isGoalFormClosed && isRecipientReport
        ? (
          <PlusButton onClick={addNewGoal} text="Add new goal" />
        ) : (
          null
        ) }
    </>
  );
};

GoalsObjectives.propTypes = {
  reportId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  onSaveDraftOetObjectives: PropTypes.func.isRequired,
};

const ReviewSection = () => {
  const { watch } = useFormContext();
  const {
    activityRecipientType,
  } = watch();

  const otherEntity = activityRecipientType === 'other-entity';

  return (
    <>
      {!otherEntity
        && <RecipientReviewSection />}
      {otherEntity
        && <OtherEntityReviewSection />}
    </>
  );
};

export default {
  position: 2,
  label: 'Goals and objectives',
  titleOverride: (formData) => {
    const { activityRecipientType } = formData;
    if (activityRecipientType === 'other-entity') {
      return 'Objectives and topics';
    }
    return 'Goals and objectives';
  },
  path: 'goals-objectives',
  review: false,
  isPageComplete: (formData) => {
    const { activityRecipientType } = formData;

    if (!activityRecipientType) {
      return false;
    }

    if (activityRecipientType === 'other-entity') {
      return validateObjectives(formData.objectivesWithoutGoals) === true;
    }
    return activityRecipientType === 'recipient' && validateGoals(formData.goals) === true;
  },
  reviewSection: () => <ReviewSection />,
  render: (_additionalData, _formData, reportId, _onSaveDraftGoal, onSaveDraftOetObjectives) => (
    <GoalsObjectives
      reportId={reportId}
      onSaveDraftOetObjectives={onSaveDraftOetObjectives}
    />
  ),
};
