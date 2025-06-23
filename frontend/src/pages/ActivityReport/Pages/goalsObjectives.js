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
import { validateGoals, validatePrompts } from './components/goalValidator';
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
    isObjectivesFormClosed,
  } = useContext(GoalFormContext);

  const showSaveGoalsAndObjButton = (
    !isGoalFormClosed
    && !isObjectivesFormClosed
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
  const modalRef = useRef(null);
  const {
    watch, setValue, getValues, setError, trigger,
  } = useFormContext();

  const {
    isGoalFormClosed,
    isObjectivesFormClosed,
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
      const areGoalsValid = validateGoals(
        [{
          ...currentlyEditing,
          name,
          endDate,
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

  const isFormOpen = !isGoalFormClosed || !isObjectivesFormClosed;

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

      {hasGrant && !isGoalFormClosed && startDateHasValue
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
