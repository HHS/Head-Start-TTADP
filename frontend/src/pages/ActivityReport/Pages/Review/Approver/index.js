import React from 'react';
import PropTypes from 'prop-types';
import { Redirect } from "react-router-dom";
import moment from 'moment';

import Review from './Review';
import Approved from './Approved';
import { REPORT_STATUSES } from '../../../../../Constants';

const Approver = ({
  onFormReview,
  reviewed,
  formData,
}) => {
  const { managerNotes, additionalNotes, status } = formData;
  const review = status === REPORT_STATUSES.SUBMITTED || status === REPORT_STATUSES.NEEDS_ACTION;
  const approved = status === REPORT_STATUSES.APPROVED;
  const time = moment().format('MM/DD/YYYY [at] h:mm a')

  return (
    <>
      {/* `reviewed` will only be true after user submits the form. */}
      {reviewed &&
      review &&
       <Redirect to={{pathname: '/activity-reports', state: {message: `You successfully reviewed on ${time}`}}} />
      }

      {reviewed &&
      approved &&
       <Redirect to={{pathname: '/activity-reports', state: {message: `You successfully approved on ${time}`}}} />
      }

      {review
      && (
      <Review
        additionalNotes={additionalNotes}
        onFormReview={onFormReview}
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

Approver.propTypes = {
  onFormReview: PropTypes.func.isRequired,
  reviewed: PropTypes.bool.isRequired,
  formData: PropTypes.shape({
    approvingManager: PropTypes.shape({
      name: PropTypes.string,
    }),
    managerNotes: PropTypes.string,
    additionalNotes: PropTypes.string,
    status: PropTypes.string,
  }).isRequired,
};

export default Approver;
