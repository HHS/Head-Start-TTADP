/* eslint-disable react/jsx-props-no-spreading */
/*
  The navigator is a component used to show multiple form pages. It displays a stickied nav window
  on the left hand side with each page of the form listed. Clicking on an item in the nav list will
  display that item in the content section. The navigator keeps track of the "state" of each page.
*/
import React, { useEffect, useState } from 'react';
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
import { saveGoalsForReport } from '../../fetchers/activityReports';
import GoalFormContext from '../../GoalFormContext';

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
  showValidationErrors,
  updateShowValidationErrors,
  errorMessage,
  updateErrorMessage,
  savedToStorageTime,
}) {
  const [showSavedDraft, updateShowSavedDraft] = useState(false);

  const page = pages.find((p) => p.path === currentPage);

  const hookForm = useForm({
    mode: 'onBlur', // putting it to onBlur as the onChange breaks the new goal form
    // todo - investigate why this is breaking the new goal form
    // mode: 'onChange', // 'onBlur' fails existing date picker validations.
    defaultValues: formData,
    shouldUnregister: false,
  });

  const {
    formState,
    getValues,
    reset,
    trigger,
    setValue,
    setError,
    watch,
  } = hookForm;

  const pageState = watch('pageState');
  const selectedGoals = watch('goals');

  const [isGoalFormClosed, toggleGoalForm] = useState(selectedGoals.length > 0);

  const goalForEditing = watch('goalForEditing');
  const activityRecipientType = watch('activityRecipientType');
  const isGoalsObjectivesPage = page.path === 'goals-objectives';

  const { isDirty, errors, isValid } = formState;
  const hasErrors = Object.keys(errors).length > 0;

  const newNavigatorState = () => {
    if (page.review) {
      return pageState;
    }

    const currentPageState = pageState[page.position];
    const isComplete = page.isPageComplete ? page.isPageComplete(getValues()) : isValid;
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

  const onSaveForm = async () => {
    if (!editable) {
      return;
    }
    const { status, ...values } = getValues();
    const data = { ...formData, ...values, pageState: newNavigatorState() };

    updateFormData(data, true);
    try {
      // Always clear the previous error message before a save.
      updateErrorMessage();
      await onSave(data);
      updateLastSaveTime(moment());
    } catch (error) {
      updateErrorMessage('A network error has prevented us from saving your activity report to our database. Your work is safely saved to your web browser in the meantime.');
    }
  };

  const onGoalFormNavigate = async () => {
    // the goal form only allows for one goal to be open at a time
    // but the objectives are stored in a subfield
    // so we need to access the objectives and bundle them together in order to validate them
    const fieldArrayName = 'goalForEditing.objectives';
    const objectives = getValues(fieldArrayName);
    const name = getValues('goalName');
    const endDate = getValues('goalEndDate');

    const goal = {
      ...goalForEditing,
      name,
      endDate,
      objectives,
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
          goals: [...selectedGoals, goal],
          activityReportId: reportId,
          regionId: formData.regionId,
        },
      );
    } catch (error) {
      updateErrorMessage('A network error has prevented us from saving your activity report to our database. Your work is safely saved to your web browser in the meantime.');
    }

    toggleGoalForm(true);
    setValue('goals', newGoals);
    setValue('goalForEditing', null);
    setValue('goalName', '');
    setValue('goalEndDate', '');

    // the form value is updated but the react state is not
    // so here we go (todo - why are there two sources of truth?)
    updateFormData({ ...formData, goals: newGoals });
  };

  const onUpdatePage = async (index) => {
    await onSaveForm();
    if (index !== page.position) {
      updatePage(index);
      updateShowSavedDraft(false);
    }
  };

  const onContinue = () => {
    onUpdatePage(page.position + 1);
  };

  useInterval(() => {
    onSaveForm();
  }, autoSaveInterval);

  // A new form page is being shown so we need to reset `react-hook-form` so validations are
  // reset and the proper values are placed inside inputs
  useDeepCompareEffect(() => {
    reset(formData);
  }, [currentPage, reset, formData]);

  useEffect(() => {
    if (showValidationErrors) {
      setTimeout(() => {
        trigger();
      });
    }
  }, [page.path, page.review, trigger, showValidationErrors]);

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

  // we show the save goals button if the form isn't closed, if we're on the goals and
  // objectives page and if we aren't just showing objectives
  const showSaveGoalsButton = isGoalsObjectivesPage && !isGoalFormClosed && activityRecipientType !== 'other-entity';

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
        <GoalFormContext.Provider value={{ isGoalFormClosed, toggleGoalForm }}>
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
              updateShowValidationErrors,
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
                {hasErrors
                && (
                  <Alert type="error" slim>
                    Please complete all required fields before submitting this report.
                  </Alert>
                )}
                <Form
                  className="smart-hub--form-large"
                >
                  {page.render(additionalData, formData, reportId)}
                  <div className="display-flex">
                    { showSaveGoalsButton
                      ? <Button className="margin-right-1" type="button" onClick={onGoalFormNavigate}>Save goal</Button>
                      : <Button className="margin-right-1" type="button" onClick={onContinue}>Save and continue</Button> }
                    <Button className="usa-button--outline" type="button" onClick={async () => { await onSaveForm(); updateShowSavedDraft(true); }}>Save draft</Button>
                    {
                      page.position <= 1
                        ? null
                        : <Button outline type="button" onClick={() => { onUpdatePage(page.position - 1); }}>Back</Button>
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
  showValidationErrors: PropTypes.bool.isRequired,
  updateShowValidationErrors: PropTypes.func.isRequired,
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
