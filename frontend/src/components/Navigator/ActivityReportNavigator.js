/* eslint-disable react/jsx-props-no-spreading */
import React, {
  useState,
  useContext,
  useMemo,
  useRef,
} from 'react';
import PropTypes from 'prop-types';
import useDeepCompareEffect from 'use-deep-compare-effect';
import { FormProvider, useForm } from 'react-hook-form';
import moment from 'moment';
import {
  IN_PROGRESS, COMPLETE,
} from './constants';
import { OBJECTIVE_RESOURCES, validateGoals, validatePrompts } from '../../pages/ActivityReport/Pages/components/goalValidator';
import { saveGoalsForReport } from '../../fetchers/activityReports';
import GoalFormContext from '../../GoalFormContext';
import AppLoadingContext from '../../AppLoadingContext';
import { convertGoalsToFormData, packageGoals } from '../../pages/ActivityReport/formDataHelpers';
import { objectivesWithValidResourcesOnly, validateListOfResources } from '../GoalForm/constants';
import Navigator from '.';
import useFormGrantData from '../../hooks/useFormGrantData';

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
  formData,
  updateFormData,
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
  savedToStorageTime,
  shouldAutoSave,
  setShouldAutoSave,
}) => {
  const [showSavedDraft, updateShowSavedDraft] = useState(false);
  const page = useMemo(() => pages.find((p) => p.path === currentPage), [currentPage, pages]);
  // eslint-disable-next-line max-len
  const goalsAndObjectivesPage = useMemo(() => pages.find((p) => p.position === GOALS_AND_OBJECTIVES_POSITION), [pages]);

  const hookForm = useForm({
    mode: 'onBlur', // putting it to onBlur as the onChange breaks the new goal form
    defaultValues: formData,
    shouldUnregister: false,
  });

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

  // Track when we've just saved goals to prevent stale formData from resetting fresh goal data
  const justSavedGoalsRef = useRef(false);

  // A new form page is being shown so we need to reset `react-hook-form` so validations are
  // reset and the proper values are placed inside inputs
  // However, skip reset if we just saved goals to prevent stale formData from overwriting
  // fresh data
  useDeepCompareEffect(() => {
    if (!justSavedGoalsRef.current) {
      reset(formData);
    } else {
      // Reset the flag after skipping one reset
      justSavedGoalsRef.current = false;
    }
  }, [currentPage, reset, formData]);

  const pageState = watch('pageState');
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

  const { isDirty, isValid } = formState;

  const recalculatePageState = () => {
    const newPageState = { ...pageState };
    const currentGoalsObjectivesPageState = pageState[GOALS_AND_OBJECTIVES_POSITION];
    const pageCompleteFunc = goalsAndObjectivesPage.isPageComplete;
    const isGoalsObjectivesPageComplete = pageCompleteFunc(getValues(), formState);
    const isCurrentPageGoalsObjectives = page.position === GOALS_AND_OBJECTIVES_POSITION;

    if (isGoalsObjectivesPageComplete) {
      newPageState[GOALS_AND_OBJECTIVES_POSITION] = COMPLETE;
    } else if (isCurrentPageGoalsObjectives && currentGoalsObjectivesPageState === COMPLETE) {
      newPageState[GOALS_AND_OBJECTIVES_POSITION] = IN_PROGRESS;
    } else if (isCurrentPageGoalsObjectives) {
      // eslint-disable-next-line max-len
      newPageState[GOALS_AND_OBJECTIVES_POSITION] = isDirty ? IN_PROGRESS : currentGoalsObjectivesPageState;
    }

    return newPageState;
  };

  /**
 * Updates the goals & objectives page state based on current form values
 * This ensures that after any API call (like recipient changes that remove goals)
 * we update the page state appropriately
 * @param {Object} currentFormData - The current form data
 */
  const updateGoalsObjectivesPageState = (currentFormData) => {
    if (!goalsAndObjectivesPage) return;

    // Re-validate the goals and objectives page using current form values
    // Prefer the freshly saved data payload to avoid using stale form values
    const isGoalsObjectivesPageComplete = goalsAndObjectivesPage
      .isPageComplete(currentFormData || getValues(), formState);

    // Desired state for the goals/objectives page
    const desiredState = isGoalsObjectivesPageComplete ? COMPLETE : IN_PROGRESS;

    // IMPORTANT: Base our merge on the most up-to-date pageState coming from the
    // data payload that just saved (currentFormData), not the watched pageState,
    // to avoid reverting other pages (e.g., Next steps) to a stale state.
    const basePageState = (currentFormData && currentFormData.pageState)
      ? currentFormData.pageState
      : (pageState || {});

    // Always update the form data to ensure downstream consumers (and tests)
    // see a post-save pageState that reflects the latest validation outcome.
    // This is a no-op when the value is unchanged, but keeps behavior consistent.
    const mergedPageState = {
      ...basePageState,
      [GOALS_AND_OBJECTIVES_POSITION]: desiredState,
    };

    updateFormData({
      ...currentFormData,
      pageState: mergedPageState,
    }, false);
  };

  const newNavigatorState = () => {
    const newPageState = recalculatePageState();

    if (page.review || page.position === GOALS_AND_OBJECTIVES_POSITION) {
      return newPageState;
    }

    const currentPageState = pageState[page.position];
    const isComplete = page.isPageComplete ? page.isPageComplete(getValues(), formState) : isValid;

    if (isComplete) {
      newPageState[page.position] = COMPLETE;
    } else if (currentPageState === COMPLETE) {
      newPageState[page.position] = IN_PROGRESS;
    } else {
      newPageState[page.position] = isDirty ? IN_PROGRESS : currentPageState;
    }

    return newPageState;
  };

  const onSaveForm = async (isAutoSave = false, forceUpdate = false) => {
    setSavingLoadScreen(isAutoSave);
    if (!editable) {
      setIsAppLoading(false);
      return;
    }
    const { status, ...values } = getValues();
    // eslint-disable-next-line no-console
    console.log('=== onSaveForm - values.goalForEditing ===', values.goalForEditing);
    const data = { ...formData, ...values, pageState: newNavigatorState() };

    try {
      // Always clear the previous error message before a save.
      updateErrorMessage();
      await onSave(data, forceUpdate);

      // After save, check and update the goals & objectives page state
      updateGoalsObjectivesPageState(data);

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
      regionId: formData.regionId,
    };

    // the above logic has packaged all the fields into a tidy goal object and we can now
    // save it to the server and update the form state
    const allGoals = packageGoals(
      selectedGoals,
      goal,
      grantIds,
      prompts,
    );

    try {
      setValue('goals', allGoals);
      const { status, ...values } = getValues();
      const data = { ...formData, ...values, pageState: newNavigatorState() };
      await onSave(data);

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
    // eslint-disable-next-line no-console
    console.log('=== onSaveDraftGoal called with isAutoSave:', isAutoSave);
    
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

    // eslint-disable-next-line no-console
    console.log('Goal values - name:', name, 'objectives:', objectives, 'promptErrors:', promptErrors);

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
      const invalid = document.querySelector('.usa-error-message + .ttahub-resource-repeater input');
      if (invalid) {
        invalid.focus();
      }
      return;
    }

    if (!isAutoSave) {
      setSavingLoadScreen(isAutoSave);
    }

    const endDate = formatEndDate(formEndDate);

    // eslint-disable-next-line no-console
    console.log('Raw objectives from form:', objectives);

    const goal = {
      ...goalForEditing,
      isActivelyBeingEditing: true,
      name,
      endDate,
      objectives: objectivesWithValidResourcesOnly(objectives),
      regionId: formData.regionId,
    };

    let allGoals = packageGoals(
      selectedGoals,
      goal,
      grantIds,
      prompts,
    );

    // eslint-disable-next-line no-console
    console.log('Packaged goals:', allGoals);
    // eslint-disable-next-line no-console
    console.log('Currently editing goal objectives:', goal.objectives.map((obj) => ({ title: obj.title, ttaProvided: obj.ttaProvided })));

    // save goal to api, come back with new ids for goal and objectives
    try {
      // we only need save goal if we have a goal name

      // eslint-disable-next-line no-console
      console.log('Calling saveGoalsForReport with:', {
        goals: allGoals,
        activityReportId: reportId,
        regionId: formData.regionId,
      });

      allGoals = await saveGoalsForReport(
        {
          goals: allGoals,
          activityReportId: reportId,
          regionId: formData.regionId,
        },
      );

      // eslint-disable-next-line no-console
      console.log('SaveGoalsForReport response:', allGoals);
      // eslint-disable-next-line no-console
      console.log('Response goals objectives:', allGoals.map((g) => ({
        name: g.name,
        objectives: g.objectives.map((obj) => ({
          title: obj.title,
          ttaProvided: obj.ttaProvided,
        })),
      })));

      /**
         * If we are autosaving, and we are currently editing a rich text editor component, do not
         * update the form data. This is to prevent the rich text editor from losing focus
         * when the form data is updated.
         *
         * This introduces the possibility of a bug with extra objectives - that is, if the user
         * enters an objective title, starts typing TTA provided, and then the autosave happens,
         * an objective will be created. If the title is then changed AFTERWARDS, before any other
         * non-autosave save happens, it will create yet another objective. This is not an issue on
         * existing objectives, nor is it an issue if another save happens in between at any point.
         */

      const allowUpdateFormData = shouldUpdateFormData(isAutoSave);

      const {
        goals, goalForEditing: newGoalForEditing,
      } = convertGoalsToFormData(allGoals, grantIds);

      // update form data
      const { status, ...values } = getValues();

      // plug in new values
      const data = {
        ...formData,
        ...values,
        goals,
        goalForEditing: newGoalForEditing,
        [objectivesFieldArrayName]: newGoalForEditing ? newGoalForEditing.objectives : null,
      };

      if (allowUpdateFormData) {
        updateFormData(data, false);
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
      // eslint-disable-next-line no-console
      console.error('Error saving goal:', error);
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
    // eslint-disable-next-line no-console
    console.log('=== onSaveAndContinueGoals called');
    
    // the goal form only allows for one goal to be open at a time
    // but the objectives are stored in a subfield
    // so we need to access the objectives and bundle them together in order to validate them
    const fieldArrayName = 'goalForEditing.objectives';
    const objectives = getValues(fieldArrayName);
    const name = getValues('goalName');
    const endDate = getValues('goalEndDate');
    const promptTitles = getValues('goalPrompts');
    const prompts = getPrompts(promptTitles, getValues);

    // eslint-disable-next-line no-console
    console.log('onSaveAndContinueGoals - Raw objectives:', objectives);
    // eslint-disable-next-line no-console
    console.log('onSaveAndContinueGoals - objectives with ttaProvided:', objectives.map((obj) => ({ title: obj.title, ttaProvided: obj.ttaProvided })));

    const goal = {
      ...goalForEditing,
      isActivelyBeingEditing: false,
      name,
      endDate,
      objectives,
      regionId: formData.regionId,
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
      // eslint-disable-next-line no-console
      console.log('onSaveAndContinueGoals - clearing form and packaging goals');
      
      // clear out the goal form
      setValue('goalForEditing', null);
      setValue('goalName', '');
      setValue('goalEndDate', '');
      setValue('goalPrompts', []);

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
      );
      
      // eslint-disable-next-line no-console
      console.log('Packaged goals for save:', packagedGoals);
      
      // save report to API
      const { status, ...values } = getValues();
      const data = {
        ...formData,
        ...values,
        goals: packagedGoals,
        pageState: newNavigatorState(),
      };
      
      // eslint-disable-next-line no-console
      console.log('Calling onSave with data:', data);
      
      const { goals } = await onSave(data);

      // eslint-disable-next-line no-console
      console.log('OnSave successful, goals:', goals);
      // eslint-disable-next-line no-console
      console.log('Response goals with ttaProvided:', goals.map((g) => ({
        name: g.name,
        objectives: g.objectives.map((obj) => ({
          title: obj.title,
          ttaProvided: obj.ttaProvided,
        })),
      })));

      // Set flag to prevent next reset from overwriting fresh goal data with stale formData
      justSavedGoalsRef.current = true;
      setValue('goals', goals);

      // On save goal re-evaluate page status.
      updateGoalsObjectivesPageState(data);

      updateErrorMessage('');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error in onSaveAndContinueGoals:', error);
      updateErrorMessage('A network error has prevented us from saving your activity report to our database. Your work is safely saved to your web browser in the meantime.');
    }

    // close the goal form
    toggleGoalForm(true);
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

  const onSaveDraft = async () => {
    try {
      setSavingLoadScreen();

      // Prevent saving draft if the form is not dirty,
      // unless we are on the supporting attachments page which can be "blank".
      if (isDirty || currentPage === 'supporting-attachments') {
        // save the form data to the server
        await onSaveForm();
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
      await onSaveDraft();
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
          updateFormData={updateFormData}
          pages={pages}
          onFormSubmit={onFormSubmit}
          onSave={onSaveForm}
          isApprover={isApprover}
          isPendingApprover={isPendingApprover} // is an approver and is pending their approval.
          onReview={onReview}
          errorMessage={errorMessage}
          updateErrorMessage={updateErrorMessage}
          savedToStorageTime={savedToStorageTime}
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
  formData: PropTypes.shape({
    calculatedStatus: PropTypes.string,
    pageState: PropTypes.shape({}),
    regionId: PropTypes.number.isRequired,
  }).isRequired,
  updateFormData: PropTypes.func.isRequired,
  errorMessage: PropTypes.string,
  updateErrorMessage: PropTypes.func.isRequired,
  lastSaveTime: PropTypes.instanceOf(moment),
  savedToStorageTime: PropTypes.string,
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
  savedToStorageTime: null,
  errorMessage: '',
  reportCreator: {
    name: null,
    role: null,
  },
  shouldAutoSave: true,
};

export default ActivityReportNavigator;
