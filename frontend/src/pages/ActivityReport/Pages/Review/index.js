import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Alert, Accordion,
} from '@trussworks/react-uswds';
import { Helmet } from 'react-helmet';

import Container from '../../../../components/Container';
import Submitter from './Submitter';
import Approver from './Approver';
import PrintSummary from '../PrintSummary';
import './index.css';
import { REPORT_STATUSES } from '../../../../Constants';

const ReviewSubmit = ({
  onSubmit,
  onReview,
  reviewItems,
  approvers,
  approvingManager,
  reportCreator,
  formData,
  pages,
}) => {
  const { additionalNotes, status } = formData;

  const [submitted, updateSubmitted] = useState(status === REPORT_STATUSES.SUBMITTED);
  const [reviewed, updateReviewed] = useState(false);
  const [error, updateError] = useState();

  const onFormSubmit = async (data) => {
    try {
      await onSubmit(data);
      updateSubmitted(true);
      updateError();
    } catch (e) {
      updateSubmitted(false);
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

  return (
    <>
      <Helmet>
        <title>Review and submit</title>
      </Helmet>
      <PrintSummary reportCreator={reportCreator} />
      <Accordion bordered={false} items={reviewItems} />
      <Container skipTopPadding className="smart-hub-review margin-top-2 padding-top-2">
        {error && (
        <Alert noIcon className="margin-y-4" type="error">
          <b>Error</b>
          <br />
          {error}
        </Alert>
        )}
        {!approvingManager
        && (
        <Submitter
          status={status}
          submitted={submitted}
          approvers={approvers}
          pages={pages}
          onFormSubmit={onFormSubmit}
          formData={formData}
        />
        )}
        {approvingManager
        && (
        <Approver
          status={status}
          reviewed={reviewed}
          additionalNotes={additionalNotes}
          onFormReview={onFormReview}
          formData={formData}
        />
        )}
      </Container>
    </>
  );
};

ReviewSubmit.propTypes = {
  approvers: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      name: PropTypes.string.isRequired,
    }),
  ).isRequired,
  onSubmit: PropTypes.func.isRequired,
  onReview: PropTypes.func.isRequired,
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
