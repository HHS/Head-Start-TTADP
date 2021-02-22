import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Accordion,
} from '@trussworks/react-uswds';
import { Helmet } from 'react-helmet';

import Submitter from './Submitter';
import Approver from './Approver';
import PrintSummary from '../PrintSummary';
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
}) => {
  const { additionalNotes, status } = formData;

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
          <Accordion bordered={false} items={reviewItems} />
        </Submitter>
        )}
      {approvingManager
        && (
        <Approver
          status={status}
          reviewed={reviewed}
          additionalNotes={additionalNotes}
          onFormReview={onFormReview}
          formData={formData}
        >
          <Accordion bordered={false} items={reviewItems} />
        </Approver>
        )}
    </>
  );
};

ReviewSubmit.propTypes = {
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
    role: PropTypes.string.isRequired,
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
