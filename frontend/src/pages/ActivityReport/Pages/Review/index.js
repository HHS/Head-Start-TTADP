import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Alert, Accordion,
} from '@trussworks/react-uswds';
import { Helmet } from 'react-helmet';

import Container from '../../../../components/Container';
import Submitter from './Submitter';
import Approver from './Approver';
import './index.css';
import { REPORT_STATUSES } from '../../../../Constants';

const ReviewSubmit = ({
  hookForm,
  allComplete,
  onSubmit,
  onReview,
  reviewItems,
  approvers,
  approvingManager,
  status,
  formData,
}) => {
  const { handleSubmit, register, formState } = hookForm;
  const { additionalNotes } = formData;
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
      <Accordion bordered={false} items={reviewItems} />
      <Container skipTopPadding className="margin-top-2 padding-top-2">
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
          register={register}
          approvers={approvers}
          valid={valid}
          handleSubmit={handleSubmit}
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
          register={register}
          valid={valid}
          handleSubmit={handleSubmit}
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
  allComplete: PropTypes.bool.isRequired,
  onSubmit: PropTypes.func.isRequired,
  onReview: PropTypes.func.isRequired,
  status: PropTypes.string.isRequired,
  approvingManager: PropTypes.bool.isRequired,
  formData: PropTypes.shape({
    additionalNotes: PropTypes.string,
  }).isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  hookForm: PropTypes.object.isRequired,
  reviewItems: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      content: PropTypes.node.isRequired,
    }),
  ).isRequired,
};

export default ReviewSubmit;
