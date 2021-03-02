import React from 'react';
import PropTypes from 'prop-types';
import { Redirect } from "react-router-dom";
import moment from 'moment';
import { Alert } from '@trussworks/react-uswds';

import Review from './Review';
import Approved from './Approved';
import { REPORT_STATUSES } from '../../../../../Constants';
import Container from '../../../../../components/Container';

const Approver = ({
  onFormReview,
  reviewed,
  formData,
  children,
  error,
}) => {
  const { managerNotes, additionalNotes, status } = formData;
  const review = status === REPORT_STATUSES.SUBMITTED || status === REPORT_STATUSES.NEEDS_ACTION;
  const approved = status === REPORT_STATUSES.APPROVED;
  const time = moment().format('MM/DD/YYYY [at] h:mm a')
  const { author } = formData;

  const renderTopAlert = () => (
    <Alert type="info" noIcon slim className="margin-bottom-1 no-print">
      {review && (
        <>
          <span className="text-bold">
            { author.name }
            {' '}
            has requested approval for this activity report.
          </span>
          <br />
          Please review all information in each section before submitting for approval.
        </>
      )}
      {approved && (
        <>
          This report has been approved and is no longer editable
        </>
      )}
    </Alert>
  );

  return (
    <>
      {renderTopAlert()}
      {children}
      <Container skipTopPadding className="margin-top-2 padding-top-2">
        {error && (
          <Alert noIcon className="margin-y-4" type="error">
            <b>Error</b>
            <br />
            {error}
          </Alert>
        )}

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
      </Container>
    </>
  );
};

Approver.propTypes = {
  onFormReview: PropTypes.func.isRequired,
  reviewed: PropTypes.bool.isRequired,
  children: PropTypes.node.isRequired,
  error: PropTypes.string,
  formData: PropTypes.shape({
    approvingManager: PropTypes.shape({
      name: PropTypes.string,
    }),
    managerNotes: PropTypes.string,
    additionalNotes: PropTypes.string,
    status: PropTypes.string,
    author: PropTypes.shape({
      name: PropTypes.string,
    }),
  }).isRequired,
};

Approver.defaultProps = {
  error: '',
};

export default Approver;
