import React from 'react';
import PropTypes from 'prop-types';
import { Redirect } from 'react-router-dom';
import moment from 'moment-timezone';
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
  const {
    managerNotes, additionalNotes, status, approvingManager,
  } = formData;
  const review = status === REPORT_STATUSES.SUBMITTED || status === REPORT_STATUSES.NEEDS_ACTION;
  const approved = status === REPORT_STATUSES.APPROVED;
  const approverStatusList = formData && approvingManager && status
    ? [{ approver: approvingManager.fullName, status }] : [];

  // NOTE: This is only an estimate of which timezone the user is in.
  // Not guaranteed to be 100% correct but is "good enough"
  // https://momentjs.com/timezone/docs/#/using-timezones/guessing-user-timezone/
  const timezone = moment.tz.guess();
  const time = moment().tz(timezone).format('MM/DD/YYYY [at] h:mm a z');
  const message = {
    time,
    reportId: formData.id,
    displayId: formData.displayId,
  };
  const { author } = formData;

  const renderTopAlert = () => (
    <Alert type="info" noIcon slim className="margin-bottom-1 no-print">
      {review && (
        <>
          <span className="text-bold">
            {author.name}
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
      <Container skipTopPadding className="margin-top-2 padding-top-2 padding-bottom-1" skipBottomPadding>
        {error && (
          <Alert noIcon className="margin-y-4" type="error">
            <b>Error</b>
            <br />
            {error}
          </Alert>
        )}

        {/* `reviewed` will only be true after user submits the form. */}
        {reviewed
          && review
          && <Redirect to={{ pathname: '/activity-reports', state: { message: { ...message, status: 'reviewed' } } }} />}

        {reviewed
          && approved
          && <Redirect to={{ pathname: '/activity-reports', state: { message: { ...message, status: 'approved' } } }} />}

        {review
          && (
            <Review
              additionalNotes={additionalNotes}
              onFormReview={onFormReview}
              approverStatusList={approverStatusList}
            />
          )}
        {approved
          && (
            <Approved
              additionalNotes={additionalNotes}
              managerNotes={managerNotes}
              approverStatusList={approverStatusList}
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
      fullName: PropTypes.string,
    }),
    managerNotes: PropTypes.string,
    additionalNotes: PropTypes.string,
    status: PropTypes.string,
    author: PropTypes.shape({
      name: PropTypes.string,
    }),
    id: PropTypes.number,
    displayId: PropTypes.string,
  }).isRequired,
};

Approver.defaultProps = {
  error: '',
};

export default Approver;
