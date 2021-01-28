/*
  The navigator is a component used to show multiple form pages. It displays a stickied nav window
  on the left hand side with each page of the form listed. Clicking on an item in the nav list will
  display that item in the content section. The navigator keeps track of the "state" of each page.
*/
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';
import { useForm } from 'react-hook-form';
import { Form, Button, Grid } from '@trussworks/react-uswds';
import useDeepCompareEffect from 'use-deep-compare-effect';
import useInterval from '@use-it/interval';
import moment from 'moment';

import Container from '../Container';

import {
  IN_PROGRESS, COMPLETE, SUBMITTED,
} from './constants';
import SideNav from './components/SideNav';
import NavigatorHeader from './components/NavigatorHeader';

function Navigator({
  initialData,
  pages,
  onFormSubmit,
  submitted,
  currentPage,
  additionalData,
  onSave,
  autoSaveInterval,
  reportId,
}) {
  const [formData, updateFormData] = useState(initialData);
  const [errorMessage, updateErrorMessage] = useState();
  const [lastSaveTime, updateLastSaveTime] = useState();
  const { pageState } = formData;

  const page = pages.find((p) => p.path === currentPage);
  const submittedNavState = submitted ? SUBMITTED : null;
  const allComplete = _.every(pageState, (state) => state === COMPLETE);

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

  const { isDirty, isValid } = formState;

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
    const data = { ...formData, ...getValues(), pageState: newNavigatorState(completed) };
    const newIndex = index === page.position ? null : index;
    try {
      updateFormData(data);
      const result = await onSave(data, newIndex);
      if (result) {
        updateLastSaveTime(moment());
      }
      updateErrorMessage();
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
    const state = p.review ? submittedNavState : stateOfPage;
    return {
      label: p.label,
      onNavigation: () => onSaveForm(false, p.position),
      state,
      current,
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
        <div id="navigator-form">
          {page.review
            && page.render(
              hookForm,
              allComplete,
              formData,
              submitted,
              onFormSubmit,
              additionalData,
              reportId,
            )}
          {!page.review
            && (
              <Container skipTopPadding>
                <NavigatorHeader
                  label={page.label}
                />
                <Form
                  onSubmit={handleSubmit(onContinue)}
                  className="smart-hub--form-large"
                >
                  {page.render(hookForm, additionalData, reportId)}
                  <Button type="submit" disabled={!isValid}>Continue</Button>
                </Form>
              </Container>
            )}
        </div>
      </Grid>
    </Grid>
  );
}

Navigator.propTypes = {
  initialData: PropTypes.shape({}),
  onFormSubmit: PropTypes.func.isRequired,
  submitted: PropTypes.bool.isRequired,
  onSave: PropTypes.func.isRequired,
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
};

Navigator.defaultProps = {
  initialData: {},
  additionalData: {},
  autoSaveInterval: 1000 * 60 * 2,
};

export default Navigator;
