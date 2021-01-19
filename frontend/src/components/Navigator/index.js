/*
  The navigator is a component used to show multiple form pages. It displays a stickied nav window
  on the left hand side with each page of the form listed. Clicking on an item in the nav list will
  display that item in the content section. The navigator keeps track of the "state" of each page.
*/
import React, { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';
import { Grid } from '@trussworks/react-uswds';

import Container from '../Container';

import {
  IN_PROGRESS, COMPLETE, SUBMITTED,
} from './constants';
import SideNav from './components/SideNav';
import Form from './components/Form';
import IndicatorHeader from './components/IndicatorHeader';

function Navigator({
  defaultValues,
  pages,
  onFormSubmit,
  initialPageState,
  submitted,
  currentPage,
  updatePage,
  additionalData,
}) {
  const [formData, updateFormData] = useState(defaultValues);
  const [pageState, updatePageState] = useState(initialPageState);
  const page = pages.find((p) => p.path === currentPage);
  const submittedNavState = submitted ? SUBMITTED : null;
  const allComplete = _.every(pageState, (state) => state === COMPLETE);

  const navigatorPages = pages.map((p) => {
    const state = p.review ? submittedNavState : pageState[p.position];
    return {
      label: p.label,
      path: p.path,
      state,
    };
  });

  const onDirty = useCallback((isDirty) => {
    updatePageState((oldNavigatorState) => {
      const newNavigatorState = { ...oldNavigatorState };
      newNavigatorState[page.position] = isDirty ? IN_PROGRESS : oldNavigatorState[page.position];
      return newNavigatorState;
    });
  }, [updatePageState, page.position]);

  const onSaveForm = useCallback((newData) => {
    updateFormData((oldData) => ({ ...oldData, ...newData }));
  }, [updateFormData]);

  const onContinue = () => {
    const newNavigatorState = { ...pageState };
    newNavigatorState[page.position] = COMPLETE;
    updatePageState(newNavigatorState);
    updatePage(page.position + 1);
  };

  const onSubmit = (data) => {
    onFormSubmit(formData, data);
  };

  return (
    <Grid row gap>
      <Grid col={12} tablet={{ col: 6 }} desktop={{ col: 4 }}>
        <SideNav
          skipTo="navigator-form"
          skipToMessage="Skip to report content"
          pages={navigatorPages}
        />
      </Grid>
      <Grid col={12} tablet={{ col: 6 }} desktop={{ col: 8 }}>
        <div id="navigator-form">
          {page.review
            && page.render(allComplete, formData, submitted, onSubmit, additionalData)}
          {!page.review
            && (
              <Container skipTopPadding>
                <IndicatorHeader
                  currentStep={page.position}
                  totalSteps={pages.filter((p) => !p.review).length}
                  label={page.label}
                />
                <Form
                  key={page.label}
                  initialData={formData}
                  onContinue={onContinue}
                  onDirty={onDirty}
                  saveForm={onSaveForm}
                  renderForm={page.render}
                />
              </Container>
            )}
        </div>
      </Grid>
    </Grid>
  );
}

Navigator.propTypes = {
  defaultValues: PropTypes.shape({}),
  onFormSubmit: PropTypes.func.isRequired,
  initialPageState: PropTypes.shape({}).isRequired,
  submitted: PropTypes.bool.isRequired,
  pages: PropTypes.arrayOf(
    PropTypes.shape({
      render: PropTypes.func.isRequired,
      label: PropTypes.isRequired,
    }),
  ).isRequired,
  currentPage: PropTypes.string.isRequired,
  updatePage: PropTypes.func.isRequired,
  additionalData: PropTypes.shape({}),
};

Navigator.defaultProps = {
  defaultValues: {},
  additionalData: {},
};

export default Navigator;
