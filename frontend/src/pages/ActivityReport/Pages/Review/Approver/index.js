import React from 'react';
import PropTypes from 'prop-types';
import { Redirect } from 'react-router-dom';
import { Alert } from '@trussworks/react-uswds';
import { REPORT_STATUSES } from '@ttahub/common';
import { useFormContext } from 'react-hook-form';
import Review from './Review';
import Container from '../../../../../components/Container';
import { formatNowForTimeZoneMessage, guessLocalTimeZone } from '../../../../../lib/dates';

const Approver = ({
  onFormReview,
  reviewed,
  children,
  error,
  isPendingApprover,
  pages,
  onFormSubmit,
  availableApprovers,
  reviewItems,
}) => {
  const { watch } = useFormContext();

  const additionalNotes = watch('additionalNotes');
  const calculatedStatus = watch('calculatedStatus');
  const approvers = watch('approvers');
  const submittedDate = watch('submittedDate');
  const id = watch('id');
  const displayId = watch('displayId');
  const author = watch('author');

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
  const timezone = guessLocalTimeZone();
  const time = formatNowForTimeZoneMessage(timezone);
  const message = {
    time,
    reportId: id,
    displayId,
  };

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
      </Alert>
    );
  };

  return (
    <>
      {renderTopAlert()}
      {children}
      <Container skipTopPadding className="margin-bottom-0 padding-top-2 padding-bottom-5" skipBottomPadding paddingY={0}>
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
              availableApprovers={availableApprovers}
              reviewItems={reviewItems}
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
  pages: PropTypes.arrayOf(PropTypes.shape({
    state: PropTypes.string,
    review: PropTypes.bool,
    label: PropTypes.string,
  })).isRequired,
  onFormSubmit: PropTypes.func.isRequired,
  reviewItems: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      content: PropTypes.node.isRequired,
    }),
  ).isRequired,
};

Approver.defaultProps = {
  error: '',
};

export default Approver;
