/* eslint-disable react/jsx-props-no-spreading */
import React, {
  useState,
  useContext,
  useMemo,
} from 'react';
import PropTypes from 'prop-types';
import { FormProvider } from 'react-hook-form';
import moment from 'moment';
import { OBJECTIVE_RESOURCES, validateGoals, validatePrompts } from '../../pages/ActivityReport/Pages/components/goalValidator';
import { saveGoalsForReport } from '../../fetchers/activityReports';
import GoalFormContext from '../../GoalFormContext';
import AppLoadingContext from '../../AppLoadingContext';
import { convertGoalsToFormData, packageGoals, extractGoalIdsInOrder } from '../../pages/ActivityReport/formDataHelpers';
import { objectivesWithValidResourcesOnly, validateListOfResources } from '../GoalForm/constants';
import Navigator from '.';
import useFormGrantData from '../../hooks/useFormGrantData';
import useNavigatorState from './useNavigatorState';

const GOALS_AND_OBJECTIVES_POSITION = 2;

/**
   *
   * @param {String[]} promptTitles
   * @param {function} getValues
   * @returns {Array} prompts
   * {
   *  promptId: number;
   *  title: string;
   *  response: string | string[] | number | number[] | boolean;
   * }
   */
export function getPrompts(promptTitles, getValues) {
  let prompts = [];
  if (promptTitles) {
    prompts = promptTitles.map(({
      promptId, title, fieldName, grantId,
    }) => {
      const response = getValues(fieldName);
      return {
        promptId,
        title,
        response,
        grantId,
      };
    });
  }

  return prompts;
}

export function getPromptErrors(promptTitles, errors) {
  let promptErrors = false;

  // break if there are errors in the prompts
  (promptTitles || []).map((f) => f.fieldName).forEach((fieldName) => {
    if (errors[fieldName]) {
      const invalid = document.querySelector(`label[for='${fieldName}']`);
      if (invalid) invalid.focus();
      promptErrors = true;
    }
  });

  return promptErrors;
}

export const formatEndDate = (formEndDate) => ((formEndDate && formEndDate.toLowerCase() !== 'invalid date') ? formEndDate : '');

/**
 * @summary checks to see if the tta provided field contains the cursor
 * if it does, we don't want to update the form data
 *
 * @param {boolean} isAutoSave
 * @returns {boolean} whether or not the form data should be updated via the hook form
 */
export const shouldUpdateFormData = (isAutoSave) => {
  if (!isAutoSave) {
    return true;
  }

  const richTextEditors = document.querySelectorAll('.rdw-editor-main');
  const selection = document.getSelection();
  return !(Array.from(richTextEditors).some((rte) => rte.contains(selection.anchorNode)));
};

const ActivityReportNavigator = ({
  editable,
  hookForm,
  pages,
  onFormSubmit,
  onReview,
  currentPage,
  additionalData,
  onSave,
  autoSaveInterval,
  isApprover,
  isPendingApprover,
  reportId,
  updatePage,
  reportCreator,
  lastSaveTime,
  updateLastSaveTime,
  errorMessage,
  updateErrorMessage,
  shouldAutoSave,
  setShouldAutoSave,
}) => {
  const [showSavedDraft, updateShowSavedDraft] = useState(false);
  const page = useMemo(() => pages.find((p) => p.path === currentPage), [currentPage, pages]);
  // eslint-disable-next-line max-len
  const goalsAndObjectivesPage = useMemo(() => pages.find((p) => p.position === GOALS_AND_OBJECTIVES_POSITION), [pages]);

  const {
    formState,
    getValues,
    setValue,
    setError,
    watch,
    errors,
    reset,
    trigger,
  } = hookForm;

  const formData = getValues();

  const selectedGoals = watch('goals');
  const goalForEditing = watch('goalForEditing');

  // App Loading Context.
  const { isAppLoading, setIsAppLoading, setAppLoadingText } = useContext(AppLoadingContext);
  // if we have a goal in the form, we want to say "goal form is not closed"
  const [isGoalFormClosed, toggleGoalForm] = useState(
    !(goalForEditing) && selectedGoals && selectedGoals.length > 0,
  );

  const setSavingLoadScreen = (isAutoSave = false) => {
    if (!isAutoSave && !isAppLoading) {
      setAppLoadingText('Saving');
      setIsAppLoading(true);
    }
  };

  const isGoalsObjectivesPage = page?.path === 'goals-objectives';
  const recipients = watch('activityRecipients');

  const {
    grantIds,
  } = useFormGrantData(recipients);

  const { isDirty } = formState;

  const { newNavigatorState, updateGoalsObjectivesPageState } = useNavigatorState({
    page,
    goalsAndObjectivesPage,
    hookForm,
  });

  const onSaveForm = async (isAutoSave = false, forceUpdate = false) => {
    setSavingLoadScreen(isAutoSave);

    const { status, ...values } = getValues();
    const data = { ...values, pageState: newNavigatorState() };

    try {
      // Always clear the previous error message before a save.
      updateErrorMessage();
      const savedData = await onSave(data, forceUpdate);

      // Update RHF with saved data (includes new IDs, etc.)
      if (savedData) {
        // Check if we should update form data
        // (prevents focus loss in rich text editors during autosave)
        const allowUpdateForm = shouldUpdateFormData(isAutoSave);

        if (allowUpdateForm) {
          reset(savedData);
        }

        // ALWAYS update page state regardless of autosave - this doesn't cause focus issues
        // After save, check and update the goals & objectives page state
        updateGoalsObjectivesPageState(savedData);
      }

      updateLastSaveTime(moment());
    } catch (error) {
      updateErrorMessage('A network error has prevented us from saving your activity report to our database. Your work is safely saved to your web browser in the meantime.');
    } finally {
      setIsAppLoading(false);
    }
  };

  const showSaveGoalsAndObjButton = isGoalsObjectivesPage
  && !isGoalFormClosed;

  /**
     * @summary This function is called when a page is navigated and is somewhat
     * equivalent to saving a draft. It isn't called if the goal form is closed.
     */
  const onSaveDraftGoalForNavigation = async () => {
    // the goal form only allows for one goal to be open at a time
    // but the objectives are stored in a subfield
    // so we need to access the objectives and bundle them together in order to validate them
    const objectivesFieldArrayName = 'goalForEditing.objectives';
    const objectives = getValues(objectivesFieldArrayName);
    const name = getValues('goalName');
    const formEndDate = getValues('goalEndDate');
    const promptTitles = getValues('goalPrompts');
    let prompts = [];
    const promptErrors = getPromptErrors(promptTitles, errors);
    if (!promptErrors) {
      prompts = getPrompts(promptTitles, getValues);
    }

    const isAutoSave = false;
    setSavingLoadScreen(isAutoSave);

    const endDate = formatEndDate(formEndDate);

    const goal = {
      ...goalForEditing,
      isActivelyBeingEditing: true,
      name,
      endDate,
      objectives: objectivesWithValidResourcesOnly(objectives),
      regionId: getValues('regionId'),
    };

    // the above logic has packaged all the fields into a tidy goal object and we can now
    // save it to the server and update the form state
    const allGoals = packageGoals(
      selectedGoals,
      goal,
      grantIds,
      prompts,
      goalForEditing?.originalIndex,
    );

    try {
      // First, set goals to the packaged goals array (with edited goal at correct position)
      setValue('goals', allGoals);

      // Calculate and set goalOrder before getting all values
      // This ensures goalOrder is included when we call getValues()
      const goalOrder = extractGoalIdsInOrder(allGoals);

      // Get all current values AFTER setting goalOrder
      const { status, ...values } = getValues();

      // Explicitly include goalOrder in the data to be saved
      const data = {
        ...values,
        goalOrder, // Explicitly add goalOrder
        pageState: newNavigatorState(),
      };
      const savedData = await onSave(data);

      // Update RHF with saved data
      if (savedData) {
        reset({
          ...savedData,
        });
      }

      updateErrorMessage('');
      updateLastSaveTime(moment());
      updateShowSavedDraft(true); // show the saved draft message
    } catch (error) {
      updateErrorMessage('A network error has prevented us from saving your activity report to our database. Your work is safely saved to your web browser in the meantime.');
    } finally {
      setIsAppLoading(false);
    }
  };

  const onSaveDraftGoal = async (isAutoSave = false) => {
    // the goal form only allows for one goal to be open at a time
    // but the objectives are stored in a subfield
    // so we need to access the objectives and bundle them together in order to validate them
    const objectivesFieldArrayName = 'goalForEditing.objectives';
    const objectives = getValues(objectivesFieldArrayName);
    const name = getValues('goalName');
    const formEndDate = getValues('goalEndDate');
    const promptTitles = getValues('goalPrompts');
    const prompts = getPrompts(promptTitles, getValues);
    const promptErrors = getPromptErrors(promptTitles, errors);

    if (promptErrors) {
      return;
    }

    let invalidResources = false;
    const invalidResourceIndices = [];

    if (objectives) {
      // refire the objective resource validation
      objectives.forEach((objective, index) => {
        if (!validateListOfResources(objective.resources)) {
          invalidResources = true;
          invalidResourceIndices.push(index);
        }
      });
    }

    if (!isAutoSave && invalidResources) {
      // make an attempt to focus on the first invalid resource
      // having a sticky header complicates this enough to make me not want to do this perfectly
      // right out of the gate
      /* istanbul ignore next */
      const invalid = document.querySelector('.usa-error-message + .ttahub-resource-repeater input');
      /* istanbul ignore next */
      if (invalid) {
        /* istanbul ignore next */
        invalid.focus();
      }
      return;
    }

    if (!isAutoSave) {
      setSavingLoadScreen(isAutoSave);
    }

    const endDate = formatEndDate(formEndDate);

    const goal = {
      ...goalForEditing,
      isActivelyBeingEditing: true,
      name,
      endDate,
      objectives: objectivesWithValidResourcesOnly(objectives),
      regionId: getValues('regionId'),
    };

    // IN-PLACE EDITING: Package goals with the edited goal at its original position
    let allGoals = packageGoals(
      selectedGoals,
      goal,
      grantIds,
      prompts,
      goalForEditing?.originalIndex,
    );

    // GOAL ORDER PRESERVATION: Calculate goalOrder BEFORE sending to backend
    //
    // WHY THIS IS CRITICAL:
    // - Backend ALWAYS returns goals ordered by activityReportGoals.createdAt
    //   (when added to report)
    // - But users want goals in the order they arranged them
    // - We must calculate goalOrder NOW, before backend changes the order
    //
    // WHAT goalOrder IS:
    // - An array of goal IDs in the correct display order:
    //   [3, 1, 2] means goal 3 first, then 1, then 2
    // - Saved to the backend so we can restore the correct order when fetching goals later
    //
    // TIMING MATTERS:
    // - If we calculated goalOrder AFTER the API call, we'd capture the wrong order
    //   (backend's createdAt order, not user's intended order)
    const goalOrder = extractGoalIdsInOrder(allGoals);

    // save goal to api, come back with new ids for goal and objectives
    try {
      // we only need save goal if we have a goal name

      allGoals = await saveGoalsForReport(
        {
          goals: allGoals,
          activityReportId: reportId,
          regionId: getValues('regionId'),
        },
      );

      /**
         * If we are autosaving, and we are currently editing a rich text editor component, do not
         * update the form. This is to prevent the rich text editor from losing focus
         * when the form is updated.
         *
         * This introduces the possibility of a bug with extra objectives - that is, if the user
         * enters an objective title, starts typing TTA provided, and then the autosave happens,
         * an objective will be created. If the title is then changed AFTERWARDS, before any other
         * non-autosave save happens, it will create yet another objective. This is not an issue on
         * existing objectives, nor is it an issue if another save happens in between at any point.
         */

      const allowUpdateForm = shouldUpdateFormData(isAutoSave);

      // GOAL ORDER RESTORATION: Use the goalOrder we calculated earlier to restore correct order
      // Backend returned goals in createdAt order, but we pass goalOrder to sort them back
      const currentFormData = getValues();
      const {
        goals, goalForEditing: newGoalForEditing,
      } = convertGoalsToFormData(
        allGoals,
        grantIds,
        currentFormData.calculatedStatus,
        goalOrder,
      );

      // Update RHF with new values (includes new IDs from API)
      if (allowUpdateForm) {
        setValue('goals', goals);
        setValue('goalForEditing', newGoalForEditing);
        setValue('goalOrder', goalOrder);
        setValue(objectivesFieldArrayName, newGoalForEditing ? newGoalForEditing.objectives : null);
      }

      updateErrorMessage('');
      updateLastSaveTime(moment());
      updateShowSavedDraft(true); // show the saved draft message
      // we have to do this here, after the form data has been updated
      if (isAutoSave && goalForEditing) {
        invalidResourceIndices.forEach((index) => {
          setError(`${objectivesFieldArrayName}[${index}].resources`, { message: OBJECTIVE_RESOURCES });
        });
      }
    } catch (error) {
      updateErrorMessage('A network error has prevented us from saving your activity report to our database. Your work is safely saved to your web browser in the meantime.');
    } finally {
      // we don't want to update the context if we are autosaving,
      // since the loading screen isn't shown
      if (!isAutoSave) {
        setIsAppLoading(false);
      }
    }
  };

  const onSaveAndContinueGoals = async () => {
    // the goal form only allows for one goal to be open at a time
    // but the objectives are stored in a subfield
    // so we need to access the objectives and bundle them together in order to validate them
    const fieldArrayName = 'goalForEditing.objectives';
    const objectives = getValues(fieldArrayName) || goalForEditing?.objectives || [];
    const name = getValues('goalName');
    const endDate = getValues('goalEndDate');
    const promptTitles = getValues('goalPrompts');
    const prompts = getPrompts(promptTitles, getValues);

    const goal = {
      ...goalForEditing,
      isActivelyBeingEditing: false,
      name,
      endDate,
      objectives,
      regionId: getValues('regionId'),
    };

    await validatePrompts(promptTitles, trigger);

    // validate goals will check the form and set errors
    // where appropriate
    const areGoalsValid = validateGoals(
      [goal],
      setError,
    );

    if (areGoalsValid !== true) {
      // make an attempt to focus on the first invalid field
      const invalid = document.querySelector('.usa-form :invalid:not(fieldset), .usa-form-group--error textarea, .usa-form-group--error input');
      if (invalid) {
        invalid.focus();
      }

      return;
    }

    const promptErrors = getPromptErrors(promptTitles, errors);
    if (promptErrors) {
      return;
    }

    // save goal to api, come back with new ids for goal and objectives
    try {
      // set goals to form data as appropriate
      const packagedGoals = packageGoals(
        selectedGoals,
        {
          ...goal,
          // we also need to make sure we only send valid objectives to the API
          objectives: objectivesWithValidResourcesOnly(goal.objectives),
        },
        grantIds,
        prompts,
        goalForEditing?.originalIndex,
      );
      // save report to API
      // Note: onSave will calculate goalOrder from the goals returned by the API
      const { status, ...values } = getValues();
      const data = {
        ...values,
        goals: packagedGoals,
        goalForEditing: null, // Explicitly clear goalForEditing since we just closed the form
        pageState: newNavigatorState(),
      };
      const savedData = await onSave(data);

      if (!savedData) {
        updateErrorMessage('A network error has prevented us from saving your activity report to our database. Your work is safely saved to your web browser in the meantime.');
        return;
      }

      // Update RHF with saved data
      if (savedData) {
        const normalizedSavedData = {
          ...savedData,
          goalForEditing: savedData.goalForEditing || '',
        };

        reset(normalizedSavedData);

        // On save goal re-evaluate page status.
        updateGoalsObjectivesPageState(normalizedSavedData);

        // clear out the goal form after a successful save
        setValue('goalForEditing.objectives', []);
        setValue('goalForEditing', '');
        setValue('goalName', '');
        setValue('goalEndDate', '');
        setValue('goalPrompts', []);

        // close the goal form
        toggleGoalForm(true);

        updateErrorMessage('');
      }
    } catch (error) {
      updateErrorMessage('A network error has prevented us from saving your activity report to our database. Your work is safely saved to your web browser in the meantime.');
    }
  };

  const onSaveAndContinueGoalsAndObjectives = async () => {
    setSavingLoadScreen();
    try {
      // Save goals for recipient report.
      await onSaveAndContinueGoals();
    } finally {
      setIsAppLoading(false);
    }
  };

  const onSaveDraft = async (isAutoSave = false) => {
    try {
      setSavingLoadScreen(isAutoSave);

      // Prevent saving draft if the form is not dirty,
      // unless we are on the supporting attachments page which can be "blank".
      if (isDirty || currentPage === 'supporting-attachments') {
        // save the form data to the server
        await onSaveForm(isAutoSave);
      }

      updateShowSavedDraft(true); // show the saved draft message
    } finally {
      setIsAppLoading(false);
    }
  };

  /**
     *
     * @param {boolean} isAutoSave whether or not an autosave is triggering the draft save
     * @param {boolean} isNavigation whether or not the draft save is triggered by a navigation
     */
  const draftSaver = async (isAutoSave = false, isNavigation = false) => {
    if (!editable) {
      setIsAppLoading(false);
      return;
    }

    // Determine if we should save draft on auto save.
    const saveGoalsDraft = isGoalsObjectivesPage && !isGoalFormClosed;

    if (saveGoalsDraft) {
      if (!isNavigation) {
        // Save recipient draft.
        await onSaveDraftGoal(isAutoSave);
      } else if (isNavigation) {
        /**
           * if we are navigating, we need to follow slightly different logic for saving.
           * The form data for the whole report should be updated so that the page state is saved.
           * This also allows for a simpler, less computationally expensive, function call
           */
        await onSaveDraftGoalForNavigation();
      }
    } else {
      // Save regular.
      await onSaveDraft(isAutoSave);
    }
  };

  const onSaveAndContinue = (() => {
    if (showSaveGoalsAndObjButton) {
      return onSaveAndContinueGoalsAndObjectives;
    }

    return null;
  })();

  return (
    <GoalFormContext.Provider value={{
      isGoalFormClosed,
      toggleGoalForm,
      isAppLoading,
      setIsAppLoading,
    }}
    >
      <FormProvider {...hookForm}>
        <Navigator
          key={currentPage}
          editable={editable}
          updatePage={updatePage}
          reportCreator={reportCreator}
          lastSaveTime={lastSaveTime}
          updateLastSaveTime={updateLastSaveTime}
          reportId={reportId}
          currentPage={currentPage}
          additionalData={additionalData}
          formData={formData}
          pages={pages}
          onFormSubmit={onFormSubmit}
          onSave={onSaveForm}
          isApprover={isApprover}
          isPendingApprover={isPendingApprover} // is an approver and is pending their approval.
          onReview={onReview}
          errorMessage={errorMessage}
          updateErrorMessage={updateErrorMessage}
          onSaveDraft={draftSaver}
          onSaveAndContinue={onSaveAndContinue}
          autoSaveInterval={autoSaveInterval}
          showSavedDraft={showSavedDraft}
          updateShowSavedDraft={updateShowSavedDraft}
          shouldAutoSave={shouldAutoSave}
          setShouldAutoSave={setShouldAutoSave}
        />
      </FormProvider>
    </GoalFormContext.Provider>
  );
};

ActivityReportNavigator.propTypes = {
  editable: PropTypes.bool.isRequired,
  hookForm: PropTypes.shape({
    formState: PropTypes.shape({
      isDirty: PropTypes.bool,
      isValid: PropTypes.bool,
    }),
    getValues: PropTypes.func,
    setValue: PropTypes.func,
    setError: PropTypes.func,
    watch: PropTypes.func,
    errors: PropTypes.shape({}),
    reset: PropTypes.func,
    trigger: PropTypes.func,
  }).isRequired,
  errorMessage: PropTypes.string,
  updateErrorMessage: PropTypes.func.isRequired,
  lastSaveTime: PropTypes.instanceOf(moment),
  updateLastSaveTime: PropTypes.func.isRequired,
  onFormSubmit: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  onReview: PropTypes.func.isRequired,
  isApprover: PropTypes.bool.isRequired,
  isPendingApprover: PropTypes.bool.isRequired,
  updatePage: PropTypes.func.isRequired,
  pages: PropTypes.arrayOf(
    PropTypes.shape({
      review: PropTypes.bool.isRequired,
      position: PropTypes.number.isRequired,
      path: PropTypes.string.isRequired,
      render: PropTypes.func.isRequired,
      label: PropTypes.string.isRequired,
    }),
  ).isRequired,
  currentPage: PropTypes.string.isRequired,
  autoSaveInterval: PropTypes.number,
  additionalData: PropTypes.shape({}),
  reportId: PropTypes.node.isRequired,
  reportCreator: PropTypes.shape({
    name: PropTypes.string,
    role: PropTypes.oneOfType([
      PropTypes.arrayOf(PropTypes.string),
      PropTypes.string,
    ]),
  }),
  shouldAutoSave: PropTypes.bool,
  setShouldAutoSave: PropTypes.func.isRequired,
};

ActivityReportNavigator.defaultProps = {
  additionalData: {},
  autoSaveInterval: 1000 * 60 * 2,
  lastSaveTime: null,
  errorMessage: '',
  reportCreator: {
    name: null,
    role: null,
  },
  shouldAutoSave: true,
};

export default ActivityReportNavigator;
