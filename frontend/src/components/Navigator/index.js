/* eslint-disable react/jsx-props-no-spreading */
/*
  The navigator is a component used to show multiple form pages. It displays a stickied nav window
  on the left hand side with each page of the form listed. Clicking on an item in the nav list will
  display that item in the content section. The navigator keeps track of the "state" of each page.
*/
import React, { useState, useContext } from 'react';
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
import useInterval from '@use-it/interval';
import moment from 'moment';
import Container from '../Container';

import {
  IN_PROGRESS, COMPLETE,
} from './constants';
import SideNav from './components/SideNav';
import NavigatorHeader from './components/NavigatorHeader';
import DismissingComponentWrapper from '../DismissingComponentWrapper';
import { validateGoals } from '../../pages/ActivityReport/Pages/components/goalValidator';
import { saveGoalsForReport, saveObjectivesForReport } from '../../fetchers/activityReports';
import GoalFormContext from '../../GoalFormContext';
import { validateObjectives } from '../../pages/ActivityReport/Pages/components/objectiveValidator';
import AppLoadingContext from '../../AppLoadingContext';
import { convertGoalsToFormData } from '../../pages/ActivityReport/formDataHelpers';

function Navigator({
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
}) {
  const [showSavedDraft, updateShowSavedDraft] = useState(false);

  const page = pages.find((p) => p.path === currentPage);

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
  } = hookForm;

  const pageState = watch('pageState');
  const selectedGoals = watch('goals');
  const selectedObjectivesWithoutGoals = watch('objectivesWithoutGoals');

  // App Loading Context.
  const { isAppLoading, setIsAppLoading, setAppLoadingText } = useContext(AppLoadingContext);
  const [isGoalFormClosed, toggleGoalForm] = useState(selectedGoals && selectedGoals.length > 0);
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

  const goalForEditing = watch('goalForEditing');
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

    // we update the form data in the onSave handler- not seeing why we need to do it twice
    // leaving this in there as a comment until I can verify that it's not needed
    // updateFormData(data);
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

  const onSaveDraftGoal = async (isAutoSave = false) => {
    // Prevent user from making changes to goal title during auto-save.
    setSavingLoadScreen(isAutoSave);

    // the goal form only allows for one goal to be open at a time
    // but the objectives are stored in a subfield
    // so we need to access the objectives and bundle them together in order to validate them
    const objectivesFieldArrayName = 'goalForEditing.objectives';
    const objectives = getValues(objectivesFieldArrayName);
    const name = getValues('goalName');
    const endDate = getValues('goalEndDate');
    const isRttapa = getValues('goalIsRttapa');

    const goal = {
      ...goalForEditing,
      isActivelyBeingEditing: true,
      name,
      endDate: endDate && endDate.toLowerCase() !== 'invalid date' ? endDate : '',
      objectives,
      isRttapa,
      regionId: formData.regionId,
      grantIds,
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

      const {
        goals, goalForEditing: newGoalForEditing,
      } = convertGoalsToFormData(allGoals, grantIds);

      // update form data
      const { status, ...values } = getValues();
      const data = {
        ...formData,
        ...values,
        goals,
        goalForEditing: newGoalForEditing,
        [objectivesFieldArrayName]: newGoalForEditing.objectives,
        pageState: newNavigatorState(),
      };

      setValue('goalForEditing', newGoalForEditing);
      setValue('goals', goals);

      // setValue(objectivesFieldArrayName, newGoalForEditing.objectives);
      updateFormData(data, true);

      updateErrorMessage('');
      updateLastSaveTime(moment());
      updateShowSavedDraft(true); // show the saved draft message
    } catch (error) {
      updateErrorMessage('A network error has prevented us from saving your activity report to our database. Your work is safely saved to your web browser in the meantime.');
    } finally {
      setIsAppLoading(false);
    }
  };

  const onSaveDraftOetObjectives = async (isAutoSave = false) => {
    // Prevent user from making changes to objectives during auto-save.
    setSavingLoadScreen(isAutoSave);

    const fieldArrayName = 'objectivesWithoutGoals';
    const currentObjectives = getValues(fieldArrayName);
    const otherEntityIds = recipients.map((otherEntity) => otherEntity.activityRecipientId);

    // Save objectives.
    try {
      const newObjectives = await saveObjectivesForReport(
        {
          objectivesWithoutGoals: currentObjectives.map((objective) => (
            { ...objective, recipientIds: otherEntityIds }
          )),
          activityReportId: reportId,
          region: formData.regionId,
        },
      );
      // Set updated objectives.
      setValue('objectivesWithoutGoals', newObjectives);
      updateLastSaveTime(moment()); // update the last saved time
      updateShowSavedDraft(true); // show the saved draft message
      updateErrorMessage('');
    } catch (error) {
      updateErrorMessage('A network error has prevented us from saving your activity report to our database. Your work is safely saved to your web browser in the meantime.');
    } finally {
      setIsAppLoading(false);
    }
  };

  const saveGoalsNavigate = async () => {
    // the goal form only allows for one goal to be open at a time
    // but the objectives are stored in a subfield
    // so we need to access the objectives and bundle them together in order to validate them
    const fieldArrayName = 'goalForEditing.objectives';
    const objectives = getValues(fieldArrayName);
    const name = getValues('goalName');
    const endDate = getValues('goalEndDate');
    const isRttapa = getValues('goalIsRttapa');

    const goal = {
      ...goalForEditing,
      isActivelyBeingEditing: false,
      name,
      endDate,
      objectives,
      isRttapa,
      regionId: formData.regionId,
    };

    // validate goals will check the form and set errors
    // where appropriate
    const areGoalsValid = validateGoals(
      [goal],
      setError,
    );

    if (areGoalsValid !== true) {
      return;
    }

    let newGoals = selectedGoals;

    // save goal to api, come back with new ids for goal and objectives
    try {
      newGoals = await saveGoalsForReport(
        {
          goals: [...selectedGoals.map((g) => ({ ...g, isActivelyBeingEditing: false })), goal],
          activityReportId: reportId,
          regionId: formData.regionId,
        },
      );
      updateErrorMessage('');
    } catch (error) {
      updateErrorMessage('A network error has prevented us from saving your activity report to our database. Your work is safely saved to your web browser in the meantime.');
    }

    toggleGoalForm(true);
    setValue('goals', newGoals);
    setValue('goalForEditing', null);
    setValue('goalName', '');
    setValue('goalEndDate', '');
    setValue('goalIsRttapa', '');
    setValue('goalForEditing.objectives', []);

    // the form value is updated but the react state is not
    // so here we go (todo - why are there two sources of truth?)
    updateFormData({
      ...formData,
      goals: newGoals,
      goalForEditing: null,
      goalName: '',
      goalEndDate: '',
      goalIsRttapa: '',
      'goalForEditing.objectives': [],
    });
  };

  const onObjectiveFormNavigate = async () => {
    // Get other-entity objectives.
    const fieldArrayName = 'objectivesWithoutGoals';
    const objectives = getValues(fieldArrayName);

    // Validate objectives.
    const areObjectivesValid = validateObjectives(objectives, setError);
    if (areObjectivesValid !== true) {
      return;
    }

    const otherEntityIds = recipients.map((otherEntity) => otherEntity.activityRecipientId);

    // Save objectives.
    let newObjectives;
    try {
      newObjectives = await saveObjectivesForReport(
        {
          objectivesWithoutGoals: objectives.map((objective) => (
            { ...objective, recipientIds: otherEntityIds }
          )),
          activityReportId: reportId,
          region: formData.regionId,
        },
      );
      updateErrorMessage('');
    } catch (error) {
      updateErrorMessage('A network error has prevented us from saving your activity report to our database. Your work is safely saved to your web browser in the meantime.');
    }

    // Close objective entry and show readonly.
    setValue('objectivesWithoutGoals', newObjectives);
    toggleObjectiveForm(true);

    // Update form data (formData has otherEntityIds).
    updateFormData({ ...formData, objectivesWithoutGoals: newObjectives });
  };

  const onGoalFormNavigate = async () => {
    setSavingLoadScreen();
    try {
      if (isOtherEntityReport) {
        // Save objectives for other-entity report.
        await onObjectiveFormNavigate();
      } else {
        // Save goals for recipient report.
        await saveGoalsNavigate();
      }
    } finally {
      setIsAppLoading(false);
    }
  };

  const draftSaver = async (isAutoSave = false) => {
    // Determine if we should save draft on auto save.
    const saveGoalsDraft = isGoalsObjectivesPage && !isGoalFormClosed;
    const saveObjectivesDraft = isGoalsObjectivesPage && !isObjectivesFormClosed;
    if (isOtherEntityReport && saveObjectivesDraft) {
      // Save other-entity draft.
      await onSaveDraftOetObjectives(isAutoSave);
    } else if (saveGoalsDraft) {
      // Save recipient draft.
      await onSaveDraftGoal(isAutoSave);
    } else {
      // Save regular.
      await onSaveForm(isAutoSave);
    }
  };

  const onUpdatePage = async (index) => {
    await draftSaver();
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
                      className="smart-hub--form-large"
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
                              <Button className="margin-right-1" type="button" disabled={isAppLoading || weAreAutoSaving} onClick={onGoalFormNavigate}>{`Save ${isOtherEntityReport ? 'objectives' : 'goal'}`}</Button>
                              <Button className="usa-button--outline" type="button" disabled={isAppLoading || weAreAutoSaving} onClick={isOtherEntityReport ? () => onSaveDraftOetObjectives(false) : () => onSaveDraftGoal(false)}>Save draft</Button>
                            </>
                          ) : (
                            <>
                              <Button className="margin-right-1" type="button" disabled={isAppLoading} onClick={onContinue}>Save and continue</Button>
                              <Button className="usa-button--outline" type="button" disabled={isAppLoading} onClick={onSaveDraft}>Save draft</Button>
                            </>
                          )}

                        {
                          page.position <= 1
                            ? null
                            : <Button outline type="button" disabled={isAppLoading} onClick={() => { onUpdatePage(page.position - 1); }}>Back</Button>
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
}

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
};

Navigator.defaultProps = {
  additionalData: {},
  autoSaveInterval: 1000 * 60 * 2,
  lastSaveTime: null,
  savedToStorageTime: null,
  errorMessage: '',
  reportCreator: {
    name: null,
    role: null,
  },
};

export default Navigator;
