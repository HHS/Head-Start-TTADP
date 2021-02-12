/* eslint-disable react/jsx-props-no-spreading */
/*
  The navigator is a component used to show multiple form pages. It displays a stickied nav window
  on the left hand side with each page of the form listed. Clicking on an item in the nav list will
  display that item in the content section. The navigator keeps track of the "state" of each page.
*/
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { FormProvider, useForm } from 'react-hook-form';
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
  formData,
  updateFormData,
  initialLastUpdated,
  pages,
  onFormSubmit,
  onReview,
  currentPage,
  additionalData,
  onSave,
  autoSaveInterval,
  approvingManager,
  reportId,
}) {
  const [errorMessage, updateErrorMessage] = useState();
  const [lastSaveTime, updateLastSaveTime] = useState(initialLastUpdated);
  const { pageState } = formData;
  const page = pages.find((p) => p.path === currentPage);

  const hookForm = useForm({
    mode: 'onChange',
    defaultValues: formData,
  });

  const {
    formState,
    handleSubmit,
    getValues,
    reset,
  } = hookForm;

  const { isDirty, errors } = formState;

  const hasErrors = Object.keys(errors).length > 0;

  const newNavigatorState = (completed) => {
    if (page.review) {
      return pageState;
    }

    const newPageState = { ...pageState };
    if (completed) {
      newPageState[page.position] = COMPLETE;
    } else {
      newPageState[page.position] = isDirty ? IN_PROGRESS : pageState[page.position];
    }
    return newPageState;
  };

  const onSaveForm = async (completed, index) => {
    const { status, ...values } = getValues();
    const data = { ...formData, ...values, pageState: newNavigatorState(completed) };
    const newIndex = index === page.position ? null : index;
    try {
      updateFormData(data);
      const result = await onSave(data, newIndex);
      if (result) {
        updateLastSaveTime(moment());
        updateErrorMessage();
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.log(error);
      updateErrorMessage('Unable to save activity report');
    }
  };

  const onContinue = () => {
    onSaveForm(true, page.position + 1);
  };

  useInterval(() => {
    onSaveForm(false);
  }, autoSaveInterval);

  // A new form page is being shown so we need to reset `react-hook-form` so validations are
  // reset and the proper values are placed inside inputs
  useDeepCompareEffect(() => {
    reset(formData);
  }, [currentPage, reset, formData]);

  const navigatorPages = pages.map((p) => {
    const current = p.position === page.position;
    const stateOfPage = current ? IN_PROGRESS : pageState[p.position];
    const state = p.review ? formData.status : stateOfPage;
    return {
      label: p.label,
      onNavigation: () => onSaveForm(false, p.position),
      state,
      current,
      review: p.review,
    };
  });

  return (
    <Grid row gap>
      <Grid col={12} tablet={{ col: 6 }} desktop={{ col: 4 }}>
        <SideNav
          skipTo="navigator-form"
          skipToMessage="Skip to report content"
          pages={navigatorPages}
          lastSaveTime={lastSaveTime}
          errorMessage={errorMessage}
        />
      </Grid>
      <Grid col={12} tablet={{ col: 6 }} desktop={{ col: 8 }}>
        <FormProvider {...hookForm}>
          <div id="navigator-form">
            {page.review
            && page.render(
              formData,
              onFormSubmit,
              additionalData,
              onReview,
              approvingManager,
              navigatorPages,
            )}
            {!page.review
            && (
              <Container skipTopPadding>
                <NavigatorHeader
                  label={page.label}
                />
                {hasErrors
                && (
                  <Alert type="error" slim>
                    Please complete all required fields before submitting this report.
                  </Alert>
                )}
                <Form
                  onSubmit={handleSubmit(onContinue)}
                  className="smart-hub--form-large"
                >
                  {page.render(additionalData, formData, reportId)}
                  <Button type="submit">Continue</Button>
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
};

Navigator.defaultProps = {
  additionalData: {},
  autoSaveInterval: 1000 * 60 * 2,
  initialLastUpdated: null,
};

export default Navigator;
