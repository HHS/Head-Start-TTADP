/* eslint-disable react/jsx-props-no-spreading */
/*
  The navigator is a component used to show multiple form pages. It displays a stickied nav window
  on the left hand side with each page of the form listed. Clicking on an item in the nav list will
  display that item in the content section. The navigator keeps track of the "state" of each page.
*/
import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { FormProvider, useForm } from 'react-hook-form/dist/index.ie11';
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

function Navigator({
  editable,
  formData,
  updateFormData,
  initialLastUpdated,
  pages,
  onFormSubmit,
  onReview,
  onResetToDraft,
  currentPage,
  additionalData,
  onSave,
  autoSaveInterval,
  approvingManager,
  reportId,
  updatePage,
  reportCreator,
}) {
  const [errorMessage, updateErrorMessage] = useState();
  const [lastSaveTime, updateLastSaveTime] = useState(initialLastUpdated);
  const [showValidationErrors, updateShowValidationErrors] = useState(false);
  const page = pages.find((p) => p.path === currentPage);

  const hookForm = useForm({
    mode: 'onChange',
    defaultValues: formData,
    shouldUnregister: false,
  });
  const pageState = hookForm.watch('pageState');

  const {
    formState,
    getValues,
    reset,
    trigger,
  } = hookForm;

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

    updateFormData(data);
    try {
      await onSave(data);
      updateLastSaveTime(moment());
      updateErrorMessage();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.log(error);
      updateErrorMessage('Unable to save activity report');
    }
  };

  const onUpdatePage = async (index) => {
    await onSaveForm();
    if (index !== page.position) {
      updatePage(index);
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
    if (showValidationErrors && !page.review) {
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

    const state = p.review ? formData.status : stateOfPage;
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
        />
      </Grid>
      <Grid className="smart-hub-navigator-wrapper" col={12} desktop={{ col: 8 }}>
        <FormProvider {...hookForm}>
          <div id="navigator-form">
            {page.review
            && page.render(
              formData,
              onFormSubmit,
              additionalData,
              onReview,
              approvingManager,
              onResetToDraft,
              onSaveForm,
              navigatorPages,
              reportCreator,
              updateShowValidationErrors,
            )}
            {!page.review
            && (
              <Container skipTopPadding>
                <NavigatorHeader
                  key={page.label}
                  label={page.label}
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
                    <Button disabled={page.position <= 1} outline type="button" onClick={() => { onUpdatePage(page.position - 1); }}>Back</Button>
                    <Button type="button" onClick={() => { onSaveForm(); }}>Save draft</Button>
                    <Button className="margin-left-auto margin-right-0" type="button" onClick={onContinue}>Save & Continue</Button>
                  </div>
                </Form>
              </Container>
            )}
          </div>
        </FormProvider>
      </Grid>
    </Grid>
  );
}

Navigator.propTypes = {
  onResetToDraft: PropTypes.func.isRequired,
  editable: PropTypes.bool.isRequired,
  formData: PropTypes.shape({
    status: PropTypes.string,
    pageState: PropTypes.shape({}),
  }).isRequired,
  updateFormData: PropTypes.func.isRequired,
  initialLastUpdated: PropTypes.instanceOf(moment),
  onFormSubmit: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  onReview: PropTypes.func.isRequired,
  approvingManager: PropTypes.bool.isRequired,
  updatePage: PropTypes.func.isRequired,
  pages: PropTypes.arrayOf(
    PropTypes.shape({
      review: PropTypes.bool.isRequired,
      position: PropTypes.number.isRequired,
      path: PropTypes.string.isRequired,
      render: PropTypes.func.isRequired,
      label: PropTypes.isRequired,
    }),
  ).isRequired,
  currentPage: PropTypes.string.isRequired,
  autoSaveInterval: PropTypes.number,
  additionalData: PropTypes.shape({}),
  reportId: PropTypes.node.isRequired,
  reportCreator: PropTypes.shape({
    name: PropTypes.string,
    role: PropTypes.string,
  }),
};

Navigator.defaultProps = {
  additionalData: {},
  autoSaveInterval: 1000 * 60 * 2,
  initialLastUpdated: null,
  reportCreator: {
    name: null,
    role: null,
  },
};

export default Navigator;
