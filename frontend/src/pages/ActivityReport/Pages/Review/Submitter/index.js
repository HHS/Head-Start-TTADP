import React from 'react';
import PropTypes from 'prop-types';

import DraftReview from './Draft';
import NeedsAction from './NeedsAction';
import Approved from './Approved';

import { REPORT_STATUSES } from '../../../../../Constants';

const Submitter = ({
  submitted,
  approvers,
  onFormSubmit,
  formData,
  onSaveForm,
  pages,
}) => {
  const {
    approvingManager,
    managerNotes,
    additionalNotes,
    status,
  } = formData;
  const notReviewed = status === REPORT_STATUSES.DRAFT || status === REPORT_STATUSES.SUBMITTED;
  const needsAction = status === REPORT_STATUSES.NEEDS_ACTION;
  const approved = status === REPORT_STATUSES.APPROVED;

  const filtered = pages.filter((p) => !(p.state === 'Complete' || p.review));
  const incompletePages = filtered.map((f) => f.label);

  return (
    <>
      {notReviewed
      && (
      <DraftReview
        submitted={submitted}
        approvers={approvers}
        onSaveForm={onSaveForm}
        onFormSubmit={onFormSubmit}
        incompletePages={incompletePages}
      />
      )}
      {needsAction
      && (
      <NeedsAction
        additionalNotes={additionalNotes}
        managerNotes={managerNotes}
        onSubmit={onFormSubmit}
        approvingManager={approvingManager}
        incompletePages={incompletePages}
      />
      )}
      {approved
      && (
      <Approved
        additionalNotes={additionalNotes}
        managerNotes={managerNotes}
      />
      )}
    </>
  );
};

Submitter.propTypes = {
  submitted: PropTypes.bool.isRequired,
  onSaveForm: PropTypes.func.isRequired,
  pages: PropTypes.arrayOf(PropTypes.shape({
    state: PropTypes.string,
    review: PropTypes.bool,
    label: PropTypes.string,
  })).isRequired,
  approvers: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.number,
    name: PropTypes.string,
  })).isRequired,
  onFormSubmit: PropTypes.func.isRequired,
  formData: PropTypes.shape({
    approvingManager: PropTypes.shape({
      name: PropTypes.string,
    }),
    managerNotes: PropTypes.string,
    additionalNotes: PropTypes.string,
    status: PropTypes.string,
  }).isRequired,
};

export default Submitter;
