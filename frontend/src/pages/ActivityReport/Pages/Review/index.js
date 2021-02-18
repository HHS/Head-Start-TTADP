import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Alert, Accordion,
} from '@trussworks/react-uswds';
import { Helmet } from 'react-helmet';
import { useFormContext } from 'react-hook-form';

import Container from '../../../../components/Container';
import Submitter from './Submitter';
import Approver from './Approver';
import PrintSummary from '../PrintSummary';
import './index.css';
import { REPORT_STATUSES } from '../../../../Constants';

const ReviewSubmit = ({
  allComplete,
  onSubmit,
  onReview,
  reviewItems,
  approvers,
  approvingManager,
  reportCreator,
  formData,
  onSaveForm,
}) => {
  const { formState } = useFormContext();
  const { additionalNotes, status } = formData;
  const { isValid } = formState;
  const valid = allComplete && isValid;

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
          allComplete={allComplete}
          approvers={approvers}
          valid={valid}
          onFormSubmit={onFormSubmit}
          formData={formData}
          onSaveForm={onSaveForm}
        />
        )}
        {approvingManager
        && (
        <Approver
          status={status}
          reviewed={reviewed}
          additionalNotes={additionalNotes}
          valid={valid}
          onFormReview={onFormReview}
          formData={formData}
        />
        )}
      </Container>
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
  allComplete: PropTypes.bool.isRequired,
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
};

export default ReviewSubmit;
