import React from 'react';
// import React, { useContext } from 'react';
import PropTypes from 'prop-types';
import { Alert } from '@trussworks/react-uswds';
import { REPORT_STATUSES } from '@ttahub/common';
import formPages from './pages';
import Review from './Review';
import Container from '../../../components/Container';
// import UserContext from '../../../UserContext';

const ReviewSubmit = ({
  onFormReview,
  formData,
  children,
  error,
  isPendingApprover,
  availableApprovers,
  reviewItems,
}) => {
  const {
    additionalNotes,
    calculatedStatus,
    submissionStatus,
    approvers,
    submittedAt,
    author,
  } = formData;

  console.log({ formData });

  // const { user } = useContext(UserContext);

  // The logic for redirecting users has been hoisted all the way up the
  // fetch at the top level CollaborationForm/index.js file

  // We only care if the report has been submitted
  // or if the current user is an approver, whether or not
  // the report has been approved

  // store some values for readability
  const isSubmitted = submissionStatus === REPORT_STATUSES.SUBMITTED;
  // const isApproved = calculatedStatus === REPORT_STATUSES.APPROVED;
  // const isNeedsAction = calculatedStatus === REPORT_STATUSES.NEEDS_ACTION;
  // const isApprover = approvers && approvers.some((a) => a.userId === user.id);

  // Approvers should be able to change their review until the report is approved.
  // isPendingApprover:
  // Tells us if the person viewing the report is an approver AND if they have a pending review.
  const review = (calculatedStatus === REPORT_STATUSES.SUBMITTED
    || calculatedStatus === REPORT_STATUSES.NEEDS_ACTION);

  const pendingOtherApprovals = review && !isPendingApprover;

  const pendingApprovalCount = approvers ? approvers.filter((a) => !a.status || a.status === 'needs_action').length : 0;
  const approverCount = approvers ? approvers.length : 0;

  // if a user is an approver and they are also the creator of the report, the logic below
  // needs to account for what they'll see
  //   const showDraftViewForApproverAndCreator = (
  //     approverIsAlsoCreator && calculatedStatus === REPORT_STATUSES.DRAFT
  //   );

  const TopAlert = () => (
    <Alert type="info" noIcon slim className="margin-bottom-1 no-print">
      {review && (
      <>
        <span className="text-bold">
          {author.fullName}
          {' '}
          has requested approval for this collaboration report (
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

  return (
    <>
      {isSubmitted && (<TopAlert />)}
      {children}
      <Container skipTopPadding className="margin-bottom-0 padding-top-2 padding-bottom-5" skipBottomPadding paddingY={0}>
        {error && (
          <Alert noIcon className="margin-y-4" type="error">
            <b>Error</b>
            <br />
            {error}
          </Alert>
        )}

        <Review
          pendingOtherApprovals={pendingOtherApprovals}
          additionalNotes={additionalNotes}
          dateSubmitted={submittedAt}
          onFormReview={onFormReview}
          approverStatusList={approvers}
          pages={formPages}
        //   showDraftViewForApproverAndCreator={showDraftViewForApproverAndCreator}
          availableApprovers={availableApprovers}
          reviewItems={reviewItems}
        />

      </Container>
    </>
  );
};

ReviewSubmit.propTypes = {
  availableApprovers: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number,
      name: PropTypes.string,
    }),
  ).isRequired,
  onFormReview: PropTypes.func.isRequired,
  children: PropTypes.node.isRequired,
  error: PropTypes.string,
  isPendingApprover: PropTypes.bool.isRequired,
  formData: PropTypes.shape({
    additionalNotes: PropTypes.string,
    calculatedStatus: PropTypes.string,
    submissionStatus: PropTypes.string,
    submittedAt: PropTypes.string,
    approvers: PropTypes.arrayOf(
      PropTypes.shape({
        status: PropTypes.string,
      }),
    ),
    author: PropTypes.shape({
      name: PropTypes.string,
      fullName: PropTypes.string,
      id: PropTypes.number,
    }),
    id: PropTypes.number,
    displayId: PropTypes.string,
  }).isRequired,
  reviewItems: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      content: PropTypes.node.isRequired,
    }),
  ).isRequired,
};

ReviewSubmit.defaultProps = {
  error: '',
};

const reviewPage = {
  position: 5,
  review: true,
  label: 'Review and submit',
  path: 'review',
  render:
    (
      formData,
      onSubmit,
      additionalData,
      onReview,
      isApprover,
      isPendingApprover,
      onSaveForm,
      allPages,
      reportCreator,
      lastSaveTime,
    ) => (
      <ReviewSubmit
        availableApprovers={additionalData.availableApprovers}
        onSubmit={onSubmit}
        onSaveForm={onSaveForm}
        onReview={onReview}
        isApprover={isApprover}
        isPendingApprover={isPendingApprover}
        lastSaveTime={lastSaveTime}
        reviewItems={
          formPages.map((p) => ({
            id: p.path,
            title: p.label,
            content: p.reviewSection(),
          }))
        }
        formData={formData}
        pages={allPages}
        reportCreator={reportCreator}
      />
    ),
};

export { ReviewSubmit };
export default reviewPage;
