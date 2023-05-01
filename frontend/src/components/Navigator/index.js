/* eslint-disable react/jsx-props-no-spreading */
/*
  The navigator is a component used to show multiple form pages. It displays a stickied nav window
  on the left hand side with each page of the form listed. Clicking on an item in the nav list will
  display that item in the content section. The navigator keeps track of the "state" of each page.
*/
import React, {
  useState,
  useContext,
  useMemo,
} from 'react';
import PropTypes from 'prop-types';
import {
  FormProvider, useForm,
} from 'react-hook-form/dist/index.ie11';
import {
  Form,
  Button,
  Grid,
  Alert,
} from '@trussworks/react-uswds';
import useDeepCompareEffect from 'use-deep-compare-effect';
import moment from 'moment';
import useInterval from '@use-it/interval';
import Container from '../Container';
import SocketAlert from '../SocketAlert';
import {
  IN_PROGRESS, COMPLETE,
} from './constants';
import SideNav from './components/SideNav';
import NavigatorHeader from './components/NavigatorHeader';
import DismissingComponentWrapper from '../DismissingComponentWrapper';
import { OBJECTIVE_RESOURCES, validateGoals } from '../../pages/ActivityReport/Pages/components/goalValidator';
import { saveGoalsForReport, saveObjectivesForReport } from '../../fetchers/activityReports';
import GoalFormContext from '../../GoalFormContext';
import { validateObjectives } from '../../pages/ActivityReport/Pages/components/objectiveValidator';
import AppLoadingContext from '../../AppLoadingContext';
import { convertGoalsToFormData } from '../../pages/ActivityReport/formDataHelpers';
import { objectivesWithValidResourcesOnly, validateListOfResources } from '../GoalForm/constants';

/**
 *
 * @param {String[]} promptTitles
 * @param {function} getValues
 * @returns {Array} prompts
 * {
 *  promptId: number;
 *  title: string;
 *  value: string | string[] | number | number[] | boolean;
 * }
 */
function getPrompts(promptTitles, getValues) {
  let prompts = [];
  if (promptTitles) {
    prompts = promptTitles.map(({ promptId, title, fieldName }) => ({
      promptId,
      title,
      response: getValues(fieldName),
    }));
  }

  return prompts;
}

/**
 *
 * @param {} isAutoSave
 * @returns
 */
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

const shouldUpdateFormData = (isAutoSave) => {
  if (!isAutoSave) {
    return false;
  }

  const richTextEditors = document.querySelectorAll('.rdw-editor-main');
  const selection = document.getSelection();
  return !(Array.from(richTextEditors).some((rte) => rte.contains(selection.anchorNode)));
};

export const formatEndDate = (formEndDate) => ((formEndDate && formEndDate.toLowerCase() !== 'invalid date') ? formEndDate : '');

const Navigator = ({
  editable,
  formData,
  updateFormData,
  pages,
  onFormSubmit,
  onReview,
  onResetToDraft,
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
  socketMessageStore,
}) => {
  const [showSavedDraft, updateShowSavedDraft] = useState(false);
  const page = useMemo(() => pages.find((p) => p.path === currentPage), [currentPage, pages]);

  const hookForm = useForm({
    mode: 'onBlur', // putting it to onBlur as the onChange breaks the new goal form
    defaultValues: formData,
    shouldUnregister: false,
  });

  const {
    formState,
    getValues,
    reset,
    setValue,
    setError,
    watch,
    errors,
  } = hookForm;

  const pageState = watch('pageState');
  const selectedGoals = watch('goals');
  const goalForEditing = watch('goalForEditing');
  const selectedObjectivesWithoutGoals = watch('objectivesWithoutGoals');

  // App Loading Context.
  const { isAppLoading, setIsAppLoading, setAppLoadingText } = useContext(AppLoadingContext);
  // if we have a goal in the form, we want to say "goal form is not closed"
  const [isGoalFormClosed, toggleGoalForm] = useState(
    !(goalForEditing) && selectedGoals && selectedGoals.length > 0,
  );
  const [weAreAutoSaving, setWeAreAutoSaving] = useState(false);

  // Toggle objectives readonly only if all objectives are saved and pass validation.
  const areInitialObjectivesValid = validateObjectives(selectedObjectivesWithoutGoals);
  const hasUnsavedObjectives = selectedObjectivesWithoutGoals.filter((u) => !u.id);
  const [isObjectivesFormClosed, toggleObjectiveForm] = useState(
    selectedObjectivesWithoutGoals.length > 0
    && areInitialObjectivesValid === true
    && hasUnsavedObjectives.length === 0,
  );

  const setSavingLoadScreen = (isAutoSave = false) => {
    if (!isAutoSave && !isAppLoading) {
      setAppLoadingText('Saving');
      setIsAppLoading(true);
    }
  };

  const activityRecipientType = watch('activityRecipientType');
  const isGoalsObjectivesPage = page.path === 'goals-objectives';
  const recipients = watch('activityRecipients');
  const isRecipientReport = activityRecipientType === 'recipient';

  const grantIds = isRecipientReport ? recipients.map((r) => {
    if (r.grant) {
      return r.grant.id;
    }

    return r.activityRecipientId;
  }) : [];

  const { isDirty, isValid } = formState;

  const newNavigatorState = () => {
    if (page.review) {
      return pageState;
    }

    const currentPageState = pageState[page.position];
    const isComplete = page.isPageComplete ? page.isPageComplete(getValues(), formState) : isValid;
    const newPageState = { ...pageState };

    if (isComplete) {
      newPageState[page.position] = COMPLETE;
    } else if (currentPageState === COMPLETE) {
      newPageState[page.position] = IN_PROGRESS;
    } else {
      newPageState[page.position] = isDirty ? IN_PROGRESS : currentPageState;
    }
    return newPageState;
  };
  const onSaveForm = async (isAutoSave = false) => {
    setSavingLoadScreen(isAutoSave);
    if (!editable) {
      setIsAppLoading(false);
      return;
    }
    const { status, ...values } = getValues();
    const data = { ...formData, ...values, pageState: newNavigatorState() };

    try {
      // Always clear the previous error message before a save.
      updateErrorMessage();
      await onSave(data);
      updateLastSaveTime(moment());
    } catch (error) {
      updateErrorMessage('A network error has prevented us from saving your activity report to our database. Your work is safely saved to your web browser in the meantime.');
    } finally {
      setIsAppLoading(false);
    }
  };

  // we show the save goals button if the form isn't closed, if we're on the goals and
  // objectives page and if we aren't just showing objectives
  const showSaveGoalsAndObjButton = isGoalsObjectivesPage
    && !isGoalFormClosed
    && !isObjectivesFormClosed;
  const isOtherEntityReport = activityRecipientType === 'other-entity';

  const onSaveDraft = async () => {
    try {
      setSavingLoadScreen();
      await onSaveForm(); // save the form data to the server
      updateShowSavedDraft(true); // show the saved draft message
    } finally {
      setIsAppLoading(false);
    }
  };

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
    const isRttapa = getValues('goalIsRttapa');

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
      isRttapa,
      regionId: formData.regionId,
      grantIds,
      prompts,
    };

    // the above logic has packaged all the fields into a tidy goal object and we can now
    // save it to the server and update the form state
    const allGoals = [...selectedGoals.map((g) => ({ ...g, isActivelyBeingEditing: false })), goal];

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
    // the goal form only allows for one goal to be open at a time
    // but the objectives are stored in a subfield
    // so we need to access the objectives and bundle them together in order to validate them
    const objectivesFieldArrayName = 'goalForEditing.objectives';
    const objectives = getValues(objectivesFieldArrayName);
    const name = getValues('goalName');
    const formEndDate = getValues('goalEndDate');
    const isRttapa = getValues('goalIsRttapa');
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

    const goal = {
      ...goalForEditing,
      isActivelyBeingEditing: true,
      name,
      endDate,
      objectives: objectivesWithValidResourcesOnly(objectives),
      isRttapa,
      regionId: formData.regionId,
      grantIds,
      prompts,
    };

    let allGoals = [...selectedGoals.map((g) => ({ ...g, isActivelyBeingEditing: false })), goal];

    // save goal to api, come back with new ids for goal and objectives
    try {
      // we only need save goal if we have a goal name
      if (name) {
        allGoals = await saveGoalsForReport(
          {
            goals: allGoals,
            activityReportId: reportId,
            regionId: formData.regionId,
          },
        );
      }

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
        updateFormData(data, true);
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

  const onSaveDraftOetObjectives = async (isAutoSave = false) => {
    const fieldArrayName = 'objectivesWithoutGoals';
    const currentObjectives = getValues(fieldArrayName);
    const otherEntityIds = recipients.map((otherEntity) => otherEntity.activityRecipientId);

    let invalidResources = false;
    const invalidResourceIndices = [];

    if (currentObjectives) {
    // refire the objective resource validation
      currentObjectives.forEach((objective, index) => {
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

    // we don't want to change the app loading context if we are autosaving
    if (!isAutoSave) {
      // Prevent user from making changes to objectives during auto-save.
      setSavingLoadScreen(isAutoSave);
    }

    // Save objectives.
    try {
      let newObjectives = await saveObjectivesForReport(
        {
          objectivesWithoutGoals: objectivesWithValidResourcesOnly(
            currentObjectives.map((objective) => (
              { ...objective, recipientIds: otherEntityIds }
            )),
          ),
          activityReportId: reportId,
          region: formData.regionId,
        },
      );

      // if we are autosaving, we want to preserve the resources that were added in the UI
      // whether or not they are valid (although nothing is saved to the database)
      // this is a convenience so that a work in progress isn't erased
      if (isAutoSave && newObjectives) {
        newObjectives = newObjectives.map((objective, objectiveIndex) => ({
          ...objective,
          resources: currentObjectives[objectiveIndex].resources,
        }));
      }

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

      // update form data
      const { status, ...values } = getValues();
      const data = { ...formData, ...values, pageState: newNavigatorState() };
      if (allowUpdateFormData) {
        updateFormData(data);
      }

      // Set updated objectives.
      setValue('objectivesWithoutGoals', newObjectives);
      updateLastSaveTime(moment()); // update the last saved time
      updateShowSavedDraft(true); // show the saved draft message
      updateErrorMessage('');

      // we have to do this here, after the form data has been updated
      if (isAutoSave) {
        invalidResourceIndices.forEach((index) => {
          setError(`${fieldArrayName}[${index}].resources`, { message: OBJECTIVE_RESOURCES });
        });
      }
    } catch (error) {
      updateErrorMessage('A network error has prevented us from saving your activity report to our database. Your work is safely saved to your web browser in the meantime.');
    } finally {
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
    const objectives = getValues(fieldArrayName);
    const name = getValues('goalName');
    const endDate = getValues('goalEndDate');
    const isRttapa = getValues('goalIsRttapa');
    const promptTitles = getValues('goalPrompts');
    const prompts = getPrompts(promptTitles, getValues);

    const goal = {
      ...goalForEditing,
      isActivelyBeingEditing: false,
      grantIds,
      name,
      endDate,
      objectives,
      isRttapa,
      regionId: formData.regionId,
      prompts,
    };

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
      // clear out the goal form
      setValue('goalForEditing', null);
      setValue('goalName', '');
      setValue('goalEndDate', '');
      setValue('goalIsRttapa', '');
      setValue('goalForEditing.objectives', []);
      setValue('goalPrompts', []);

      // set goals to form data as appropriate
      setValue('goals', [
        // we make sure to mark all the read only goals as "ActivelyEdited: false"
        ...selectedGoals.map((g) => ({ ...g, isActivelyBeingEditing: false })),
        {
          ...goal,
          // we also need to make sure we only send valid objectives to the API
          objectives: objectivesWithValidResourcesOnly(goal.objectives),
        },
      ]);

      // save report to API
      const { status, ...values } = getValues();
      const data = { ...formData, ...values, pageState: newNavigatorState() };
      await onSave(data);

      updateErrorMessage('');
    } catch (error) {
      updateErrorMessage('A network error has prevented us from saving your activity report to our database. Your work is safely saved to your web browser in the meantime.');
    }

    // close the goal form
    toggleGoalForm(true);
  };

  const onObjectiveSaveAndContinue = async () => {
    // Get other-entity objectives.
    const fieldArrayName = 'objectivesWithoutGoals';
    const objectives = getValues(fieldArrayName);

    // Validate objectives.
    const areObjectivesValid = validateObjectives(objectives, setError);
    if (areObjectivesValid !== true) {
      return;
    }

    const otherEntityIds = recipients.map((otherEntity) => otherEntity.activityRecipientId);

    try {
      setValue('objectivesWithoutGoals', objectivesWithValidResourcesOnly(objectives.map((objective) => (
        { ...objective, recipientIds: otherEntityIds }
      ))));

      updateErrorMessage('');
    } catch (error) {
      updateErrorMessage('A network error has prevented us from saving your activity report to our database. Your work is safely saved to your web browser in the meantime.');
    }

    toggleObjectiveForm(true);
  };

  const onSaveAndContinueGoalsAndObjectives = async () => {
    setSavingLoadScreen();
    try {
      if (isOtherEntityReport) {
        // Save objectives for other-entity report.
        await onObjectiveSaveAndContinue();
      } else {
        // Save goals for recipient report.
        await onSaveAndContinueGoals();
      }
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
    const saveGoalsDraft = isGoalsObjectivesPage && !isGoalFormClosed && isRecipientReport;
    const saveObjectivesDraft = (
      isGoalsObjectivesPage && !isObjectivesFormClosed && !isRecipientReport
    );

    if (isOtherEntityReport && saveObjectivesDraft) {
      // Save other-entity draft.
      await onSaveDraftOetObjectives(isAutoSave);
    } else if (saveGoalsDraft) {
      if (!isNavigation) {
        // Save recipient draft.
        await onSaveDraftGoal(isAutoSave, isNavigation);
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
      await onSaveForm(isAutoSave);
    }
  };

  const onUpdatePage = async (index) => {
    // name the parameters for clarity
    const isAutoSave = false;
    const isNavigation = true;

    // save the current page
    await draftSaver(isAutoSave, isNavigation);

    // navigate to the next page
    if (index !== page.position) {
      updatePage(index);
      updateShowSavedDraft(false);
    }
  };

  const onContinue = () => {
    setSavingLoadScreen();
    onUpdatePage(page.position + 1);
  };

  useInterval(async () => {
    // Don't auto save if we are already saving, or if the form hasn't been touched
    try {
      if (!isAppLoading && isDirty && !weAreAutoSaving) {
        // this is used to disable the save buttons
        // (we don't use the overlay on auto save)
        setWeAreAutoSaving(true);
        await draftSaver(true);
      }
    } finally {
      setWeAreAutoSaving(false); // enable the save buttons
    }
  }, autoSaveInterval);

  // A new form page is being shown so we need to reset `react-hook-form` so validations are
  // reset and the proper values are placed inside inputs
  useDeepCompareEffect(() => {
    reset(formData);
  }, [currentPage, reset, formData]);

  const navigatorPages = pages.map((p) => {
    const current = p.position === page.position;

    let stateOfPage = pageState[p.position];
    if (stateOfPage !== COMPLETE) {
      stateOfPage = current ? IN_PROGRESS : pageState[p.position];
    }

    const state = p.review ? formData.calculatedStatus : stateOfPage;
    return {
      label: p.label,
      onNavigation: () => {
        onUpdatePage(p.position);
      },
      state,
      current,
      review: p.review,
    };
  });

  return (
    <Grid row gap>
      <Grid className="smart-hub-sidenav-wrapper no-print" col={12} desktop={{ col: 4 }}>
        <SideNav
          skipTo="navigator-form"
          skipToMessage="Skip to report content"
          pages={navigatorPages}
          lastSaveTime={lastSaveTime}
          errorMessage={errorMessage}
          savedToStorageTime={savedToStorageTime}
        />
      </Grid>
      <Grid className="smart-hub-navigator-wrapper" col={12} desktop={{ col: 8 }}>
        <SocketAlert store={socketMessageStore} />
        <GoalFormContext.Provider value={{
          isGoalFormClosed,
          isObjectivesFormClosed,
          toggleGoalForm,
          toggleObjectiveForm,
          isAppLoading,
          setIsAppLoading,
        }}
        >
          <FormProvider {...hookForm}>
            <div id="navigator-form">
              {page.review
                && page.render(
                  formData,
                  onFormSubmit,
                  additionalData,
                  onReview,
                  isApprover,
                  isPendingApprover,
                  onResetToDraft,
                  onSaveForm,
                  navigatorPages,
                  reportCreator,
                  lastSaveTime,
                )}
              {!page.review
                && (
                  <Container skipTopPadding>
                    <NavigatorHeader
                      key={page.label}
                      label={page.label}
                      titleOverride={page.titleOverride}
                      formData={formData}
                    />
                    <Form
                      className="smart-hub--form-large smart-hub--form__activity-report-form"
                    >
                      {page.render(
                        additionalData,
                        formData,
                        reportId,
                        onSaveDraftGoal,
                        onSaveDraftOetObjectives,
                      )}
                      <div className="display-flex">
                        {showSaveGoalsAndObjButton
                          ? (
                            <>
                              <Button id={`draft-${page.path}-save-continue`} className="margin-right-1" type="button" disabled={isAppLoading || weAreAutoSaving} onClick={onSaveAndContinueGoalsAndObjectives}>{`Save ${isOtherEntityReport ? 'objectives' : 'goal'}`}</Button>
                              <Button id={`draft-${page.path}-save-draft`} className="usa-button--outline" type="button" disabled={isAppLoading || weAreAutoSaving} onClick={isOtherEntityReport ? () => onSaveDraftOetObjectives(false) : () => onSaveDraftGoal(false)}>Save draft</Button>
                            </>
                          ) : (
                            <>
                              <Button id={`draft-${page.path}-save-continue`} className="margin-right-1" type="button" disabled={isAppLoading} onClick={onContinue}>Save and continue</Button>
                              <Button id={`draft-${page.path}-save-draft`} className="usa-button--outline" type="button" disabled={isAppLoading} onClick={onSaveDraft}>Save draft</Button>
                            </>
                          )}
                        {
                          page.position <= 1
                            ? null
                            : <Button id={`draft-${page.path}-back`} outline type="button" disabled={isAppLoading} onClick={() => { onUpdatePage(page.position - 1); }}>Back</Button>
                        }
                      </div>
                    </Form>
                    <DismissingComponentWrapper
                      shown={showSavedDraft}
                      updateShown={updateShowSavedDraft}
                      hideFromScreenReader={false}
                    >
                      {lastSaveTime && (
                        <Alert className="margin-top-3 maxw-mobile-lg" noIcon slim type="success" aria-live="off">
                          Draft saved on
                          {' '}
                          {lastSaveTime.format('MM/DD/YYYY [at] h:mm a z')}
                        </Alert>
                      )}
                    </DismissingComponentWrapper>
                  </Container>
                )}
            </div>
          </FormProvider>
        </GoalFormContext.Provider>
      </Grid>
    </Grid>
  );
};

Navigator.propTypes = {
  onResetToDraft: PropTypes.func.isRequired,
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
  socketMessageStore: PropTypes.shape({
    user: PropTypes.oneOfType([
      PropTypes.shape({
        name: PropTypes.string,
      }),
      PropTypes.string,
    ]),
  }),
};

Navigator.defaultProps = {
  additionalData: {},
  autoSaveInterval: 1000 * 60 * 2,
  lastSaveTime: null,
  savedToStorageTime: null,
  errorMessage: '',
  socketMessageStore: null,
  reportCreator: {
    name: null,
    role: null,
  },
};

export default Navigator;
