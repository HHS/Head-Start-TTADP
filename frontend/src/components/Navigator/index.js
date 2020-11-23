/*
  The navigator is a component used to show multiple form pages. It displays a stickied nav window
  on the left hand side with each page of the form listed. Clicking on an item in the nav list will
  display that item in the content section. The navigator keeps track of the "state" of each page.
  In the future logic will be added to the navigator to prevent the complete form from being
  submitted until every page is completed.
*/
import React, { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Grid } from '@trussworks/react-uswds';

import Container from '../Container';

import {
  NOT_STARTED, IN_PROGRESS, COMPLETE,
} from './constants';
import SideNav from './components/SideNav';
import Form from './components/Form';
import IndicatorHeader from './components/IndicatorHeader';

/*
  Get the current state of navigator items. Sets the currently selected item as "In Progress" and
  sets a "current" flag which the side nav uses to style the selected component as selected.
*/
const navigatorPages = (pages, navigatorState, currentPage) => pages.map((page, index) => {
  const current = currentPage === index;
  const state = current ? IN_PROGRESS : navigatorState[index];
  return {
    label: page.label,
    state,
    current,
  };
});

function Navigator({
  defaultValues, pages, onFormSubmit,
}) {
  const [data, updateData] = useState(defaultValues);
  const [currentPage, updateCurrentPage] = useState(0);
  const [navigatorState, updateNavigatorState] = useState(pages.map(() => (NOT_STARTED)));
  const page = pages[currentPage];
  const lastPage = pages.length - 1;

  const onNavigation = (index) => {
    updateCurrentPage(index);
  };

  const onDirty = useCallback((isDirty) => {
    updateNavigatorState((oldNavigatorState) => {
      const newNavigatorState = [...oldNavigatorState];
      newNavigatorState[currentPage] = isDirty ? IN_PROGRESS : oldNavigatorState[currentPage];
      return newNavigatorState;
    });
  }, [updateNavigatorState, currentPage]);

  const saveForm = useCallback((newData) => {
    updateData((oldData) => ({ ...oldData, ...newData }));
  }, [updateData]);

  const onSubmit = (formData) => {
    const newNavigatorState = [...navigatorState];
    newNavigatorState[currentPage] = COMPLETE;
    updateNavigatorState(newNavigatorState);

    if (currentPage + 1 > lastPage) {
      onFormSubmit({ ...data, ...formData });
    } else {
      updateCurrentPage((prevPage) => prevPage + 1);
    }
  };

  return (
    <Grid row gap>
      <Grid col={12} tablet={{ col: 6 }} desktop={{ col: 4 }}>
        <SideNav
          skipTo="navigator-form"
          skipToMessage="Skip to report content"
          onNavigation={onNavigation}
          pages={navigatorPages(pages, navigatorState, currentPage)}
        />
      </Grid>
      <Grid col={12} tablet={{ col: 6 }} desktop={{ col: 8 }}>
        <Container skipTopPadding>
          <IndicatorHeader
            currentStep={currentPage + 1}
            totalSteps={pages.length}
            label={page.label}
          />
          <div id="navigator-form">
            <Form
              key={page.label}
              initialData={data}
              onSubmit={onSubmit}
              onDirty={onDirty}
              saveForm={saveForm}
              renderForm={page.renderForm}
            />
          </div>
        </Container>
      </Grid>
    </Grid>
  );
}

Navigator.propTypes = {
  defaultValues: PropTypes.shape({}),
  onFormSubmit: PropTypes.func.isRequired,
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
