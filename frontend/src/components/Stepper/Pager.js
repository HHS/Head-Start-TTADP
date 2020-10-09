/*
  Used to page through components in a specific step. It uses onNextStep and
  onPreviousStep to let the parent component know it has reached the start/end of it's
  pages. It does not currently support being nested inside another <Pager />. It may
  be possible to update it to support nesting if needed in the future, but it isn't
  currently built with nesting in mind
*/

import React, { useState } from 'react';
import PropTypes from 'prop-types';

function Pager({
  firstStep, lastStep, pages, fromNextStep, onNextStep, onPreviousStep, data,
}) {
  // fromNextStep is true if we are coming from a later step (the current step is
  // step 2 and the previous step was step 3, the user clicked the 'previous' button).
  // If we are coming from a later step we need to show the last page in the current step.
  const startIndex = fromNextStep ? pages.length - 1 : 0;
  const [currentPage, updateCurrentPage] = useState(startIndex);
  const [formData, updateData] = useState(data);

  const firstPage = currentPage === 0;
  const lastPage = currentPage === pages.length - 1;
  // Used to disable the "previous" button if this is the first page of the first step
  const first = firstStep && firstPage;
  // used to show the "submit" (as opposed to "next") button if this is the last page
  // of the last step
  const last = lastStep && lastPage;

  const onNextPage = (newData) => {
    const newFormData = { ...formData, ...newData };
    if (lastPage) {
      onNextStep(newFormData);
    } else {
      updateData(newFormData);
      updateCurrentPage(currentPage + 1);
    }
  };

  const onPreviousPage = () => {
    if (firstPage) {
      onPreviousStep();
    } else {
      updateCurrentPage(currentPage - 1);
    }
  };

  const page = pages[currentPage];

  return (
    <>
      {page({
        first,
        last,
        onNextStep: onNextPage,
        onPreviousStep: onPreviousPage,
        data,
      })}
    </>
  );
}

Pager.propTypes = {
  firstStep: PropTypes.bool.isRequired,
  lastStep: PropTypes.bool.isRequired,
  pages: PropTypes.arrayOf(PropTypes.func).isRequired,
  fromNextStep: PropTypes.bool.isRequired,
  onNextStep: PropTypes.func.isRequired,
  onPreviousStep: PropTypes.func.isRequired,
  // data is form data coming in, we won't know the shape of
  // the data object since this component is supposed to be
  // reuseable between multiple forms
  // eslint-disable-next-line react/forbid-prop-types
  data: PropTypes.object.isRequired,
};

export default Pager;
