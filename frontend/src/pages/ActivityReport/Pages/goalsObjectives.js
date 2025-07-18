/* eslint-disable react/jsx-props-no-spreading */
// disabling prop spreading to use the "register" function from react hook form the same
// way they did in their examples
import React, {
  useState, useContext, useRef,
} from 'react';
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
import { NOOP } from '../../../Constants';
import useFormGrantData, { calculateFormGrantData } from '../../../hooks/useFormGrantData';
import Modal from '../../../components/Modal';

const GOALS_AND_OBJECTIVES_PAGE_STATE_IDENTIFIER = '2';

const Buttons = ({
  formData,
  isAppLoading,
  onContinue,
  onSaveDraft,
  onUpdatePage,
  weAreAutoSaving,
}) => {
  const {
    isGoalFormClosed,
    isObjectivesFormClosed,
  } = useContext(GoalFormContext);

  const { activityRecipientType } = formData;
  const isOtherEntityReport = activityRecipientType === 'other-entity';

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

Buttons.propTypes = {
  formData: PropTypes.shape({
    activityRecipientType: PropTypes.string,
  }).isRequired,
  isAppLoading: PropTypes.bool.isRequired,
  onContinue: PropTypes.func.isRequired,
  onSaveDraft: PropTypes.func.isRequired,
  onUpdatePage: PropTypes.func.isRequired,
  weAreAutoSaving: PropTypes.bool.isRequired,
};

const GoalsObjectives = ({
  reportId,
}) => {
  // NOTE: Temporary fix until we can figure out why mesh-kit is duplicating data
  // Check if this is the first time the user has opened the page,
  // if so, we need to refresh the page to ensure mesh-kit doesn't have duplicated data.
  const isFirstLoad = window.localStorage.getItem(`goals-${reportId}-loaded`) === null;
  if (isFirstLoad) {
    window.localStorage.setItem(`goals-${reportId}-loaded`, 'true');
    window.location.reload();
  }

  const modalRef = useRef(null);
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
  const startDate = watch('startDate');
  const pageState = getValues('pageState');
  const goalForEditing = watch('goalForEditing');

  const {
    isRecipientReport,
    grantIds,
    hasMultipleGrants,
    hasGrant,
  } = useFormGrantData(activityRecipientType, activityRecipients);

  const isOtherEntityReport = activityRecipientType === 'other-entity';
  const activityRecipientIds = activityRecipients.map((r) => r.activityRecipientId);

  const [fetchError, setFetchError] = useState(false);
  const [availableGoals, updateAvailableGoals] = useState([]);
  const [goalTemplates, setGoalTemplates] = useState([]);
  const [goalToRemove, setGoalToRemove] = useState(null);

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
    const fetchGoalTemplates = async () => {
      if (isRecipientReport && hasGrant) {
        try {
          const fetchedGoalTemplates = await getGoalTemplates(grantIds);

          // format goalTemplates
          const formattedGoalTemplates = fetchedGoalTemplates.map((gt) => ({
            ...gt,
            isCurated: true,
            goalIds: gt.goals.map((g) => g.id),
            goalTemplateId: gt.id,
            isNew: gt.goals.length === 0,
            objectives: [],
          }));

          setGoalTemplates(formattedGoalTemplates);
        } catch (err) {
        // eslint-disable-next-line no-console
          console.error(err);
        }
      }
    };

    fetchGoalTemplates();
  }, [grantIds, hasGrant, isRecipientReport]);

  useDeepCompareEffect(() => {
    const fetch = async () => {
      try {
        if (isRecipientReport && hasGrant) {
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
  }, [grantIds, hasGrant, isRecipientReport]);

  const showGoals = isRecipientReport && hasGrant;

  const addNewGoal = () => {
    toggleGoalForm(false);
    // An empty value here means that the Select dropdown will show its placeholder.
    setValue('goalForEditing', null);

    // newGoal(grantIds) is still passed to the dropdown as part of the `options` prop,
    // so 'create a new goal' will still be an option.
  };

  const onRemove = () => {
    const goalId = goalToRemove.id;
    const copyOfSelectedGoals = selectedGoals.map((g) => ({ ...g }));
    const index = copyOfSelectedGoals.findIndex((g) => g.id === goalId);

    if (index !== -1) {
      copyOfSelectedGoals.splice(index, 1);
    }

    onUpdateGoals(copyOfSelectedGoals);

    // if we have no goals, open the form up via the
    // handler provided by the context
    // Unless we are currently editing a goal and removing at the same time.
    if (copyOfSelectedGoals.length === 0 && !goalForEditing) {
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
        hasMultipleGrants,
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

  const startDateHasValue = startDate && startDate !== 'Invalid date';

  const alertIsDisplayed = (!isOtherEntityReport && !isRecipientReport)
    || !startDateHasValue
    || (isRecipientReport && !showGoals);
  const determineReportTypeAlert = () => {
    const messages = [];

    // Check that the report type is set.
    if ((!isOtherEntityReport && !isRecipientReport)
    || (isRecipientReport && !showGoals)) {
      messages.push('Who the activity was for');
    }
    // Check the startDate is set.
    if (!startDateHasValue) {
      messages.push('Start date of the activity');
    }

    if (messages.length > 0) {
      return (
        <Alert className="maxw-desktop" type="info">
          To add goals and objectives, indicate in the
          {' '}
          <Link to={`/activity-reports/${reportId}/activity-summary`}>Activity Summary</Link>
          :
          {' '}
          <ul>
            {messages.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </Alert>
      );
    }
    return null;
  };

  return (
    <>
      <Helmet>
        <title>Goals and Objectives</title>
      </Helmet>
      <Modal
        modalRef={modalRef}
        title="Are you sure you want to delete this goal?"
        modalId="remove-goal-modal"
        onOk={() => {
          onRemove(modalRef.current.goal);
          if (modalRef.current.modalIsOpen) {
            modalRef.current.toggleModal();
          }
        }}
        okButtonText="Remove"
        okButtonAriaLabel="remove goal"
      >
        <p>If you remove the goal, the objectives and TTA provided content will also be deleted.</p>
      </Modal>
      { isFormOpen && !alertIsDisplayed && (
      <IndicatesRequiredField />
      ) }

      {
        determineReportTypeAlert()
      }

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

      {/**
        * all goals for review
      */}
      { goalsForReview.length ? (
        <ReadOnly
          onEdit={onEdit}
          onRemove={(goal) => {
            setGoalToRemove(goal);
            modalRef.current.toggleModal();
          }}
          createdGoals={goalsForReview}
        />
      ) : null }

      {/**
        * conditionally show the goal picker
      */}

      {showGoals && !isGoalFormClosed && startDateHasValue
        ? (
          <>
            <h3 className="margin-bottom-0 margin-top-4">Goal summary</h3>
            { fetchError && (<ConnectionError />)}
            <Fieldset className="margin-0">
              <GoalPicker
                grantIds={grantIds}
                availableGoals={availableGoals}
                reportId={reportId}
                goalTemplates={goalTemplates}
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
    const { activityRecipientType, activityRecipients } = formData;

    const { hasMultipleGrants } = calculateFormGrantData(activityRecipientType, activityRecipients);

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

    return activityRecipientType === 'recipient' && validateGoals(formData.goals, NOOP, hasMultipleGrants) === true;
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
  ) => (
    <>
      <GoalsObjectives
        reportId={reportId}
      />
      <DraftAlert />
      <Buttons
        formData={formData}
        isAppLoading={isAppLoading || false}
        onContinue={onContinue}
        onSaveDraft={onSaveDraft}
        onUpdatePage={onUpdatePage}
        weAreAutoSaving={weAreAutoSaving}
      />
    </>
  ),
};
