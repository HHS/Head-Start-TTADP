import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Accordion,
} from '@trussworks/react-uswds';
import { Helmet } from 'react-helmet';

import Submitter from './Submitter';
import Approver from './Approver';
import PrintSummary from '../PrintSummary';
import { REPORT_STATUSES } from '../../../../Constants';
import './index.css';

const ReviewSubmit = ({
  onSubmit,
  onReview,
  reviewItems,
  availableApprovers,
  isApprover,
  isPendingApprover,
  reportCreator,
  formData,
  onResetToDraft,
  onSaveForm,
  pages,
  updateShowValidationErrors,
}) => {
  const { additionalNotes, calculatedStatus } = formData;

  useEffect(() => {
    updateShowValidationErrors(true);
  }, [updateShowValidationErrors]);

  const [reviewed, updateReviewed] = useState(false);
  const [error, updateError] = useState();

  const onFormSubmit = async (data) => {
    try {
      await onSubmit(data);
      updateError();
    } catch (e) {
      updateError('Unable to submit report');
    }
  };

  const onFormReview = async (data) => {
    try {
      await onReview(data);
      updateReviewed(true);
      updateError();
    } catch (e) {
      updateReviewed(false);
      updateError('Unable to review report');
    }
  };

  const onReset = async () => {
    try {
      await onResetToDraft();
      updateError();
    } catch (e) {
      updateError('Unable to reset Activity Report to draft');
    }
  };

  const editing = calculatedStatus === REPORT_STATUSES.DRAFT
    || calculatedStatus === REPORT_STATUSES.NEEDS_ACTION;
  const items = editing ? reviewItems : reviewItems.map((ri) => ({
    ...ri,
    expanded: true,
  }));

  return (
    <>
      <Helmet>
        <title>Review and submit</title>
      </Helmet>
      <PrintSummary reportCreator={reportCreator} />
      {!isApprover
        && (
          <Submitter
            availableApprovers={availableApprovers}
            pages={pages}
            onFormSubmit={onFormSubmit}
            onResetToDraft={onReset}
            formData={formData}
            error={error}
            onSaveForm={onSaveForm}
          >
            <>
              <h2>test2</h2>
              <h3>test3</h3>
              <Accordion bordered={false} items={items} />
            </>
          </Submitter>
        )}
      {isApprover
        && (
          <Approver
            reviewed={reviewed}
            additionalNotes={additionalNotes}
            onFormReview={onFormReview}
            error={error}
            formData={formData}
            isPendingApprover={isPendingApprover}
          >
            <Accordion bordered={false} items={items} />
          </Approver>
        )}
    </>
  );
};

ReviewSubmit.propTypes = {
  updateShowValidationErrors: PropTypes.func.isRequired,
  onSaveForm: PropTypes.func.isRequired,
  availableApprovers: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      name: PropTypes.string.isRequired,
    }),
  ).isRequired,
  onSubmit: PropTypes.func.isRequired,
  onReview: PropTypes.func.isRequired,
  onResetToDraft: PropTypes.func.isRequired,
  isApprover: PropTypes.bool.isRequired,
  isPendingApprover: PropTypes.bool.isRequired,
  formData: PropTypes.shape({
    additionalNotes: PropTypes.string,
    calculatedStatus: PropTypes.string,
  }).isRequired,
  reportCreator: PropTypes.shape({
    name: PropTypes.string.isRequired,
    role: PropTypes.arrayOf(PropTypes.string).isRequired,
  }).isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  reviewItems: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      content: PropTypes.node.isRequired,
    }),
  ).isRequired,
  pages: PropTypes.arrayOf(PropTypes.shape({
    review: PropTypes.bool,
    state: PropTypes.string,
    label: PropTypes.string,
  })).isRequired,
};

export default ReviewSubmit;
