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
  approvers,
  approvingManager,
  reportCreator,
  formData,
  onResetToDraft,
  onSaveForm,
  pages,
  updateShowValidationErrors,
}) => {
  const { additionalNotes, status } = formData;

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

  const editing = status === REPORT_STATUSES.DRAFT || status === REPORT_STATUSES.NEEDS_ACTION;
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
      {!approvingManager
        && (
        <Submitter
          status={status}
          approvers={approvers}
          pages={pages}
          onFormSubmit={onFormSubmit}
          onResetToDraft={onReset}
          formData={formData}
          error={error}
          onSaveForm={onSaveForm}
        >
          <Accordion bordered={false} items={items} />
        </Submitter>
        )}
      {approvingManager
        && (
        <Approver
          status={status}
          reviewed={reviewed}
          additionalNotes={additionalNotes}
          onFormReview={onFormReview}
          error={error}
          formData={formData}
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
  approvers: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      name: PropTypes.string.isRequired,
    }),
  ).isRequired,
  onSubmit: PropTypes.func.isRequired,
  onReview: PropTypes.func.isRequired,
  onResetToDraft: PropTypes.func.isRequired,
  approvingManager: PropTypes.bool.isRequired,
  formData: PropTypes.shape({
    additionalNotes: PropTypes.string,
    status: PropTypes.string,
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
