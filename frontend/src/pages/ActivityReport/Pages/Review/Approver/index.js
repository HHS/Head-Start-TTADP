import React, { useContext } from 'react';
import PropTypes from 'prop-types';
import { Redirect } from 'react-router-dom';
import moment from 'moment-timezone';
import { Alert } from '@trussworks/react-uswds';
import { REPORT_STATUSES } from '@ttahub/common';
import UserContext from '../../../../../UserContext';
import Review from './Review';
import Approved from '../Approved';
import Container from '../../../../../components/Container';

const Approver = ({
  onFormReview,
  reviewed,
  formData,
  children,
  error,
  isPendingApprover,
  pages,
  onResetToDraft,
  onFormSubmit,
  availableApprovers,
}) => {
  const {
    additionalNotes,
    calculatedStatus,
    approvers,
    submittedDate,
  } = formData;

  // Approvers should be able to change their review until the report is approved.
  // isPendingApprover:
  // Tells us if the person viewing the report is an approver AND if they have a pending review.
  const review = (calculatedStatus === REPORT_STATUSES.SUBMITTED
    || calculatedStatus === REPORT_STATUSES.NEEDS_ACTION);
  const approved = calculatedStatus === REPORT_STATUSES.APPROVED;
  const pendingOtherApprovals = review && !isPendingApprover;

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
  const { user } = useContext(UserContext);

  const pendingApprovalCount = approvers ? approvers.filter((a) => !a.status || a.status === 'needs_action').length : 0;
  const approverCount = approvers ? approvers.length : 0;

  const approverIsAlsoCreator = approvers ? approvers.some((a) => a.user.id === author.id) : false;

  // if a user is an approver and they are also the creator of the report, the logic below
  // needs to account for what they'll see
  const showDraftViewForApproverAndCreator = (
    approverIsAlsoCreator && calculatedStatus === REPORT_STATUSES.DRAFT
  );

  const submissionFunction = showDraftViewForApproverAndCreator ? onFormSubmit : onFormReview;

  const renderTopAlert = () => {
    if (showDraftViewForApproverAndCreator) {
      return null;
    }

    return (
      <Alert type="info" noIcon slim className="margin-bottom-1 no-print">
        {review && (
        <>
          <span className="text-bold">
            {author.name}
            {' '}
            has requested approval for this activity report (
            <strong>
              {`${pendingApprovalCount} of
             ${approverCount}`}
              {' '}
              reviews pending
            </strong>
            ).
          </span>
          <br />
          Please review all information in each section before submitting.
        </>
        )}
        {approved && (
        <>
          This report has been approved and is no longer editable
        </>
        )}
      </Alert>
    );
  };

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

        {(review || showDraftViewForApproverAndCreator)
          && (
            <Review
              pendingOtherApprovals={pendingOtherApprovals}
              additionalNotes={additionalNotes}
              dateSubmitted={submittedDate}
              onFormReview={submissionFunction}
              approverStatusList={approvers}
              pages={pages}
              showDraftViewForApproverAndCreator={showDraftViewForApproverAndCreator}
              creatorIsApprover={author.id === user.id}
              onResetToDraft={onResetToDraft}
              calculatedStatus={calculatedStatus}
              availableApprovers={availableApprovers}
            />
          )}
        {approved
          && (
            <Approved
              additionalNotes={additionalNotes}
              approverStatusList={approvers}
            />
          )}
      </Container>
    </>
  );
};

Approver.propTypes = {
  availableApprovers: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number,
      name: PropTypes.string,
    }),
  ).isRequired,
  onFormReview: PropTypes.func.isRequired,
  reviewed: PropTypes.bool.isRequired,
  children: PropTypes.node.isRequired,
  error: PropTypes.string,
  isPendingApprover: PropTypes.bool.isRequired,
  formData: PropTypes.shape({
    additionalNotes: PropTypes.string,
    calculatedStatus: PropTypes.string,
    submittedDate: PropTypes.string,
    approvers: PropTypes.arrayOf(
      PropTypes.shape({
        status: PropTypes.string,
      }),
    ),
    author: PropTypes.shape({
      name: PropTypes.string,
      id: PropTypes.number,
    }),
    id: PropTypes.number,
    displayId: PropTypes.string,
  }).isRequired,
  pages: PropTypes.arrayOf(PropTypes.shape({
    state: PropTypes.string,
    review: PropTypes.bool,
    label: PropTypes.string,
  })).isRequired,
  onResetToDraft: PropTypes.func.isRequired,
  onFormSubmit: PropTypes.func.isRequired,
};

Approver.defaultProps = {
  error: '',
};

export default Approver;
