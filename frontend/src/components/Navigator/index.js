/*
  The navigator is a component used to show multiple form pages. It displays a stickied nav window
  on the left hand side with each page of the form listed. Clicking on an item in the nav list will
  display that item in the content section. The navigator keeps track of the "state" of each page.
  In the future logic will be added to the navigator to prevent the complete form from being
  submitted until every page is completed.
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

/*
  Get the current state of navigator items. Sets the currently selected item as "In Progress" and
  sets a "current" flag which the side nav uses to style the selected component as selected.
*/
function Navigator({
  defaultValues, pages, onFormSubmit, initialPageState, renderReview, submitted,
}) {
  const [formData, updateFormData] = useState(defaultValues);
  const [viewReview, updateViewReview] = useState(false);
  const [currentPage, updateCurrentPage] = useState(0);
  const [pageState, updatePageState] = useState(initialPageState);
  const lastPage = pages.length - 1;

  const onNavigation = (index) => {
    updateViewReview(false);
    updateCurrentPage(index);
  };

  const onDirty = useCallback((isDirty) => {
    updatePageState((oldNavigatorState) => {
      const newNavigatorState = [...oldNavigatorState];
      newNavigatorState[currentPage] = isDirty ? IN_PROGRESS : oldNavigatorState[currentPage];
      return newNavigatorState;
    });
  }, [updatePageState, currentPage]);

  const onSaveForm = useCallback((newData) => {
    updateFormData((oldData) => ({ ...oldData, ...newData }));
  }, [updateFormData]);

  const onContinue = () => {
    const newNavigatorState = [...pageState];
    newNavigatorState[currentPage] = COMPLETE;
    updatePageState(newNavigatorState);

    if (currentPage >= lastPage) {
      updateViewReview(true);
    } else {
      updateCurrentPage((prevPage) => prevPage + 1);
    }
  };

  const navigatorPages = pages.map((page, index) => {
    const current = !viewReview && currentPage === index;
    const state = pageState[index];
    return {
      label: page.label,
      onClick: () => onNavigation(index),
      state,
      current,
    };
  });

  const onViewReview = () => {
    updateViewReview(true);
  };

  const onSubmit = () => {
    onFormSubmit(formData);
  };

  const allComplete = _.every(pageState, (state) => state === COMPLETE);

  const reviewPage = {
    label: 'Review and submit',
    onClick: onViewReview,
    state: submitted ? SUBMITTED : undefined,
    current: viewReview,
    renderForm: renderReview,
  };

  navigatorPages.push(reviewPage);
  const page = viewReview ? reviewPage : pages[currentPage];

  return (
    <Grid row gap>
      <Grid col={12} tablet={{ col: 6 }} desktop={{ col: 4 }}>
        <SideNav
          skipTo="navigator-form"
          skipToMessage="Skip to report content"
          onNavigation={onNavigation}
          pages={navigatorPages}
        />
      </Grid>
      <Grid col={12} tablet={{ col: 6 }} desktop={{ col: 8 }}>
        <Container skipTopPadding>
          <IndicatorHeader
            currentStep={viewReview ? navigatorPages.length : currentPage + 1}
            totalSteps={navigatorPages.length}
            label={page.label}
          />
          <div id="navigator-form">
            {viewReview
              && renderReview(allComplete, onSubmit)}
            {!viewReview
            && (
            <Form
              key={page.label}
              initialData={formData}
              onContinue={onContinue}
              onDirty={onDirty}
              saveForm={onSaveForm}
              renderForm={page.renderForm}
            />
            )}
          </div>
        </Container>
      </Grid>
    </Grid>
  );
}

Navigator.propTypes = {
  defaultValues: PropTypes.shape({}),
  onFormSubmit: PropTypes.func.isRequired,
  initialPageState: PropTypes.arrayOf(PropTypes.string).isRequired,
  renderReview: PropTypes.func.isRequired,
  submitted: PropTypes.bool.isRequired,
  pages: PropTypes.arrayOf(
    PropTypes.shape({
      renderForm: PropTypes.func.isRequired,
      label: PropTypes.isRequired,
    }),
  ).isRequired,
};

Navigator.defaultProps = {
  defaultValues: {},
};

export default Navigator;
