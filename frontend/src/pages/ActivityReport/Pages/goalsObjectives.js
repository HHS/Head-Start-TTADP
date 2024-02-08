/* eslint-disable react/jsx-props-no-spreading */
// disabling prop spreading to use the "register" function from react hook form the same
// way they did in their examples
import React, { useState, useContext } from 'react';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet';
import { Alert, Fieldset, Button } from '@trussworks/react-uswds';
import useDeepCompareEffect from 'use-deep-compare-effect';
import { useFormContext, useController } from 'react-hook-form';
import { Link } from 'react-router-dom';
import GoalPicker from './components/GoalPicker';
import { IN_PROGRESS } from '../../../components/Navigator/constants';
import { getGoals, setGoalAsActivelyEdited } from '../../../fetchers/activityReports';
import { validateGoals, validatePrompts } from './components/goalValidator';
import RecipientReviewSection from './components/RecipientReviewSection';
import OtherEntityReviewSection from './components/OtherEntityReviewSection';
import { validateObjectives } from './components/objectiveValidator';
import ConnectionError from '../../../components/ConnectionError';
import ReadOnly from '../../../components/GoalForm/ReadOnly';
import PlusButton from '../../../components/GoalForm/PlusButton';
import OtherEntity from './components/OtherEntity';
import GoalFormContext from '../../../GoalFormContext';
import ReadOnlyOtherEntityObjectives from '../../../components/GoalForm/ReadOnlyOtherEntityObjectives';
import IndicatesRequiredField from '../../../components/IndicatesRequiredField';
import { getGoalTemplates } from '../../../fetchers/goalTemplates';
import NavigatorButtons from '../../../components/Navigator/components/NavigatorButtons';

const GOALS_AND_OBJECTIVES_PAGE_STATE_IDENTIFIER = '2';

const GoalsObjectives = ({
  reportId,
}) => {
  const {
    watch, setValue, getValues, setError, trigger,
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
  const pageState = getValues('pageState');
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
          const fetchedGoalTemplates = await getGoalTemplates(grantIds);
          const formattedGoals = fetchedGoals.map((g) => {
            // if the goal is on an "old" grant, we should
            // treat it like a new goal for now
            let isNew = false;

            if (grantIds.some((id) => g.grantIds.includes(id))) {
              isNew = true;
            }

            return { ...g, isNew, grantIds };
          });

          const goalNames = formattedGoals.map((g) => g.name);

          updateAvailableGoals([
            ...fetchedGoalTemplates.filter((g) => !goalNames.includes(g.name)),
            ...formattedGoals,
          ]);
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
      setValue('goalSource', '');
      toggleGoalForm(false);
    }
  };

  const onEdit = async (goal) => {
    try {
      await setGoalAsActivelyEdited(reportId, goal.goalIds, pageState);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('failed to set goal as actively edited with this error:', err);
    }

    const currentlyEditing = getValues('goalForEditing') ? { ...getValues('goalForEditing') } : null;
    if (currentlyEditing) {
      const goalForEditingObjectives = getValues('goalForEditing.objectives') ? [...getValues('goalForEditing.objectives')] : [];
      const name = getValues('goalName');
      const endDate = getValues('goalEndDate');
      const source = getValues('goalSource');
      const areGoalsValid = validateGoals(
        [{
          ...currentlyEditing,
          name,
          endDate,
          source,
          objectives: goalForEditingObjectives,
        }],
        setError,
      );

      if (areGoalsValid !== true) {
        return;
      }

      const promptTitles = getValues('goalPrompts');

      const arePromptsValid = await validatePrompts(promptTitles, trigger);
      if (!arePromptsValid) {
        return;
      }
    }

    // clear out the existing value (we need to do this because without it
    // certain objective fields don't clear out)
    setValue('goalForEditing', null);
    setValue('goalPrompts', []);

    // make this goal the editable goal
    setValue('goalForEditing', goal);
    setValue('goalEndDate', goal.endDate);
    setValue('goalSource', goal.source);
    setValue('goalName', goal.name);

    toggleGoalForm(false);
    setValue(
      'pageState',
      {
        ...pageState,
        [GOALS_AND_OBJECTIVES_PAGE_STATE_IDENTIFIER]: IN_PROGRESS,
      },
    );

    let copyOfSelectedGoals = selectedGoals.map((g) => ({ ...g }));
    // add the goal that was being edited to the "selected goals"
    if (currentlyEditing) {
      copyOfSelectedGoals.push(currentlyEditing);
    }

    // remove the goal we are now editing from the "selected goals"
    copyOfSelectedGoals = copyOfSelectedGoals.filter((g) => g.id !== goal.id);
    onUpdateGoals(copyOfSelectedGoals);
  }; // end onEdit

  // the read only component expects things a little differently
  const goalsForReview = selectedGoals.map((goal) => ({
    ...goal,
    goalName: goal.name,
    grants: [],
  }));

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

  const isFormOpen = (
    isRecipientReport && !isGoalFormClosed
  ) || (
    isOtherEntityReport && !isObjectivesFormClosed
  );

  return (
    <>
      <Helmet>
        <title>Goals and Objectives</title>
      </Helmet>
      { isFormOpen && (
      <IndicatesRequiredField />
      ) }

      {(!isOtherEntityReport && !isRecipientReport) && (
        <Alert noIcon type="info">
          To add goals and objectives, indicate who the activity was for in
          {' '}
          <Link to={`/activity-reports/${reportId}/activity-summary`}>Activity Summary</Link>
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

    // if the goal form is open (i.e. the goal for editing is set), the page cannot be complete
    // at least as far as my thinking goes
    if (activityRecipientType === 'recipient' && formData.goalForEditing) {
      return false;
    }

    return activityRecipientType === 'recipient' && validateGoals(formData.goals) === true;
  },
  reviewSection: () => <ReviewSection />,
  render: (
    _additionalData,
    formData,
    reportId,
    isAppLoading,
    onContinue,
    onSaveDraft,
    onUpdatePage,
    weAreAutoSaving,
    _datePickerKey,
    _onFormSubmit,
    DraftAlert,
  ) => {
    const { activityRecipientType } = formData;
    const isOtherEntityReport = activityRecipientType === 'other-entity';

    const Buttons = () => {
      const {
        isGoalFormClosed,
        isObjectivesFormClosed,
      } = useContext(GoalFormContext);

      const showSaveGoalsAndObjButton = (
        !isGoalFormClosed
        && !isObjectivesFormClosed
      );

      if (showSaveGoalsAndObjButton) {
        return (
          <>
            <Button id="draft-goals-objectives-save-continue" className="margin-right-1" type="button" disabled={isAppLoading || weAreAutoSaving} onClick={onContinue}>{`Save ${isOtherEntityReport ? 'objectives' : 'goal'}`}</Button>
            <Button id="draft-goals-objectives-save-draft" className="usa-button--outline" type="button" disabled={isAppLoading || weAreAutoSaving} onClick={() => onSaveDraft(false)}>Save draft</Button>
            <Button id="draft-goals-objectives-back" outline type="button" disabled={isAppLoading} onClick={() => { onUpdatePage(1); }}>Back</Button>
          </>
        );
      }

      return (
        <NavigatorButtons
          isAppLoading={isAppLoading}
          onContinue={onContinue}
          onSaveDraft={onSaveDraft}
          onUpdatePage={onUpdatePage}
          path="goals-objectives"
          position={2}
        />
      );
    };

    return (
      <>
        <GoalsObjectives
          reportId={reportId}
        />
        <DraftAlert />
        <Buttons />
      </>
    );
  },
};
