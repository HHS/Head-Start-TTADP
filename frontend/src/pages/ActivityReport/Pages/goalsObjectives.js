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
import { setGoalAsActivelyEdited } from '../../../fetchers/activityReports';
import { validateGoals } from './components/goalValidator';
import RecipientReviewSection from './components/RecipientReviewSection';
import ReadOnly from '../../../components/GoalForm/ReadOnly';
import PlusButton from '../../../components/GoalForm/PlusButton';
import GoalFormContext from '../../../GoalFormContext';
import IndicatesRequiredField from '../../../components/IndicatesRequiredField';
import { getGoalTemplates } from '../../../fetchers/goalTemplates';
import NavigatorButtons from '../../../components/Navigator/components/NavigatorButtons';
import { NOOP } from '../../../Constants';
import useFormGrantData from '../../../hooks/useFormGrantData';
import Modal from '../../../components/Modal';
import ConnectionError from '../../../components/ConnectionError';
import './goalsObjectives.scss';

const GOALS_AND_OBJECTIVES_PAGE_STATE_IDENTIFIER = '2';

const Buttons = ({
  isAppLoading,
  onContinue,
  onSaveDraft,
  onUpdatePage,
  weAreAutoSaving,
}) => {
  const {
    isGoalFormClosed,
  } = useContext(GoalFormContext);

  const showSaveGoalsAndObjButton = (
    !isGoalFormClosed
  );

  if (showSaveGoalsAndObjButton) {
    return (
      <>
        <Button id="draft-goals-objectives-save-continue" className="margin-right-1" type="button" disabled={isAppLoading || weAreAutoSaving} onClick={onContinue}>Save goal</Button>
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
    toggleGoalForm,
  } = useContext(GoalFormContext);

  const activityRecipients = watch('activityRecipients');
  const startDate = watch('startDate');
  const pageState = getValues('pageState');
  const goalForEditing = watch('goalForEditing');

  const {
    grantIds,
    hasMultipleGrants,
    hasGrant,
  } = useFormGrantData(activityRecipients);

  const [fetchError, setFetchError] = useState(false);
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
      if (hasGrant) {
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
          setFetchError(false);
        } catch (err) {
          setFetchError(true);
          // eslint-disable-next-line no-console
          console.error(err);
        }
      }
    };

    fetchGoalTemplates();
  }, [grantIds, hasGrant]);

  const addNewGoal = () => {
    toggleGoalForm(false);
    // An empty value here means that the Select dropdown will show its placeholder.
    setValue('goalForEditing', null);

    // newGoal(grantIds) is still passed to the dropdown as part of the `options` prop,
    // so 'create a new goal' will still be an option.
  };

  const onRemove = () => {
    const goalId = goalToRemove.id;
    // Deep copy to avoid shared references to nested arrays like goalIds
    const copyOfSelectedGoals = selectedGoals.map((g) => ({
      ...g,
      goalIds: g.goalIds ? [...g.goalIds] : [],
      objectives: g.objectives ? g.objectives.map((obj) => ({ ...obj })) : [],
      prompts: g.prompts ? g.prompts.map((p) => ({ ...p })) : [],
    }));
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
      toggleGoalForm(false);

      // Update the page state to reflect that there are no goals
      // This ensures the UI correctly shows the "In progress" state
      const currentPageState = { ...pageState };
      currentPageState[GOALS_AND_OBJECTIVES_PAGE_STATE_IDENTIFIER] = IN_PROGRESS;
      setValue('pageState', currentPageState);
    }

    if (modalRef.current.modalIsOpen) {
      modalRef.current.toggleModal();
    }
  };

  const onEdit = (goal) => {
    // eslint-disable-next-line no-console
    console.log('=== onEdit CALLED ===', goal);

    // Call the async operation but don't await it in the click handler
    setGoalAsActivelyEdited(reportId, goal.goalIds, pageState).catch((err) => {
      // eslint-disable-next-line no-console
      console.error('failed to set goal as actively edited with this error:', err);
    });

    const currentlyEditing = getValues('goalForEditing') ? { ...getValues('goalForEditing') } : null;
    console.log('------------Currently editing goal:', currentlyEditing);
    
    // Deep copy to avoid shared references to nested arrays like goalIds
    // Remove the goal being edited from the goals array FIRST to prevent duplication
    // It will be stored in goalForEditing and recombined during save
    const copyOfSelectedGoals = selectedGoals
      .filter((g) => g.id !== goal.id)
      .map((g) => ({
        ...g,
        goalIds: g.goalIds ? [...g.goalIds] : [],
        objectives: g.objectives ? g.objectives.map((obj) => ({ ...obj })) : [],
        prompts: g.prompts ? g.prompts.map((p) => ({ ...p })) : [],
      }));

    // would like to use structuredClone here for brevity but it would require fighting jsdom
    // let copyOfSelectedGoals = selectedGoals.map((g) => structuredClone(g));

    // update the previously edited goal in place (if one exists)
    if (currentlyEditing) {
      const previousGoalIndex = copyOfSelectedGoals.findIndex((g) => g.id === currentlyEditing.id);
      if (previousGoalIndex !== -1) {
        // Get the current edited values from the form
        const goalForEditingObjectives = getValues('goalForEditing.objectives') ? [...getValues('goalForEditing.objectives')] : [];
        const updatedName = getValues('goalName');
        const updatedEndDate = getValues('goalEndDate');

        const areGoalsValid = validateGoals(
          [{
            ...currentlyEditing,
            name: updatedName,
            endDate: updatedEndDate,
            objectives: goalForEditingObjectives,
          }],
          setError,
          hasMultipleGrants,
        );

        if (areGoalsValid !== true) {
          // eslint-disable-next-line no-console
          console.log('Goals validation failed');
        }

        trigger().then((isValid) => {
          if (!isValid) {
            // eslint-disable-next-line no-console
            console.log('Prompts validation failed');
          }
        });

        // Update currentlyediting goal in place with modified form values
        copyOfSelectedGoals[previousGoalIndex] = {
          ...currentlyEditing,
          name: updatedName,
          endDate: updatedEndDate,
          objectives: goalForEditingObjectives,
        };
      }
    }

    // Update the goals array in the form (removing the goal being edited)
    onUpdateGoals(copyOfSelectedGoals);
    
    // clear out the existing value (we need to do this because without it
    // certain objective fields don't clear out)
    setValue('goalForEditing', null);
    setValue('goalPrompts', goal.prompts || []);

    // make this goal the editable goal
    setValue('goalForEditing', goal);
    setValue('goalEndDate', goal.endDate);
    setValue('goalName', goal.name);

    toggleGoalForm(false);
    setValue(
      'pageState',
      {
        ...pageState,
        [GOALS_AND_OBJECTIVES_PAGE_STATE_IDENTIFIER]: IN_PROGRESS,
      },
    );

    // eslint-disable-next-line no-console
    console.log('onEdit completed, goalForEditing should now be:', goal);
  }; // end onEdit

  // the read only component expects things a little differently
  // Deep copy goalIds to ensure independent array references
  // Build goals list, maintaining order and including editing goal at its position
  // Note: This is used for reference, but goals are now rendered individually above
  // to support inline editing

  // Add a variable to determine if a recipient has been selected.
  const hasRecipient = activityRecipients && activityRecipients.length > 0;

  const startDateHasValue = startDate && startDate !== 'Invalid date';

  const alertIsDisplayed = !startDateHasValue || !hasGrant;
  const determineReportTypeAlert = () => {
    const messages = [];

    // Check if the report is a recipient report.
    if (!hasRecipient) {
      messages.push('Recipient for the activity');
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
        onOk={onRemove}
        okButtonText="Remove"
        okButtonAriaLabel="remove goal"
      >
        <p>If you remove the goal, the objectives and TTA provided content will also be deleted.</p>
      </Modal>
      { !isGoalFormClosed && !alertIsDisplayed && (
      <IndicatesRequiredField />
      ) }

      <p className="usa-prose margin-bottom-4">Using a goal on an Activity Report will set the goal’s status to In progress.</p>

      {
        determineReportTypeAlert()
      }

      {/**
        * on non-recipient reports, only objectives are shown
      */}

      {/**
        * all goals for review
      */}
      { selectedGoals.length ? (
        <div>
          {selectedGoals.map((goal) => (
            <div key={`goal-${goal.id}`}>
              {goalForEditing && goal.id === goalForEditing.id ? (
                // Render the editing form inline
                <GoalPicker
                  grantIds={grantIds}
                  reportId={reportId}
                  goalTemplates={goalTemplates}
                />
              ) : (
                // Render the read-only goal
                <ReadOnly
                  onEdit={() => onEdit(goal)}
                  onRemove={(g) => {
                    setGoalToRemove(g);
                    modalRef.current.toggleModal();
                  }}
                  createdGoals={[{
                    ...goal,
                    goalName: goal.name,
                    grants: [],
                    goalIds: goal.goalIds ? [...goal.goalIds] : [],
                  }]}
                />
              )}
            </div>
          ))}
        </div>
      ) : null }

      {/**
        * If the goal form is open (form not closed), show the GoalPicker
        * This is used for both adding new goals and editing existing ones
      */}
      {(() => {
        const showInlineGoalPicker = !isGoalFormClosed && goalForEditing && (
          goalForEditing.id === 'new' || !selectedGoals.some((g) => g.id === goalForEditing.id)
        );
        return showInlineGoalPicker;
      })() ? (
        <div>
          <GoalPicker
            grantIds={grantIds}
            reportId={reportId}
            goalTemplates={goalTemplates}
          />
        </div>
        ) : null }

      {/**
        * conditionally show the goal picker
        * Only show when creating a new goal, not when editing an existing one
        * (existing goals show the picker inline at their position)
      */}

      {hasGrant && !isGoalFormClosed && startDateHasValue && !(goalForEditing && goalForEditing.id !== 'new')
        ? (
          <>
            { fetchError && (<ConnectionError />)}
            <Fieldset className="margin-0">
              <GoalPicker
                grantIds={grantIds}
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
      {hasGrant && isGoalFormClosed
        ? (
          <PlusButton onClick={addNewGoal} className="ttahub-plus-button-no-margin-top" text="Add new goal" />
        ) : (
          null
        ) }
    </>
  );
};

GoalsObjectives.propTypes = {
  reportId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
};

const ReviewSection = () => (
  <>
    <RecipientReviewSection />
  </>
);

export default {
  position: 2,
  label: 'Goals and objectives',
  titleOverride: () => ('Goals and objectives'),
  path: 'goals-objectives',
  review: false,
  isPageComplete: (formData) => {
    // if the goal form is open (i.e. the goal for editing is set), the page cannot be complete
    // at least as far as my thinking goes
    if (formData.goalForEditing) {
      return false;
    }

    return validateGoals(formData.goals, NOOP) === true;
  },
  reviewSection: () => <ReviewSection />,
  render: (
    _additionalData,
    _formData,
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
        isAppLoading={isAppLoading || false}
        onContinue={onContinue}
        onSaveDraft={onSaveDraft}
        onUpdatePage={onUpdatePage}
        weAreAutoSaving={weAreAutoSaving}
      />
    </>
  ),
};
