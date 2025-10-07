/* eslint-disable max-len */
/* eslint-disable no-unused-vars */
import React, { useContext } from 'react';
import PropTypes from 'prop-types';
import { Alert } from '@trussworks/react-uswds';
// import { REPORT_STATUSES } from '@ttahub/common';
import Review from './Review';
import Container from '../../../components/Container';
import UserContext from '../../../UserContext';

const ReviewSubmitSession = ({
  onReview,
  formData,
  error,
  isPendingApprover,
  availableApprovers,
  onUpdatePage,
  onSaveForm,
  onSaveDraft,
  onSubmit,
  pages,
}) => {
  const {
    calculatedStatus,
    submissionStatus,
    submittedAt,
    author,
    userId,
  } = formData;

  const { user } = useContext(UserContext);

  // The logic for redirecting users has been hoisted all the way up the
  // fetch at the top level CollaborationForm/index.js file

  // We only care if the report has been submitted
  // or if the current user is an approver, whether or not
  // the report has been approved

  // store some values for readability
  const isCreator = userId === user.id;
  // eslint-disable-next-line max-len
  // const isCollaborator = collabReportSpecialists.some(({ specialistId }) => user.id === specialistId);
  // const isSubmitted = submissionStatus === REPORT_STATUSES.SUBMITTED;
  // const isApproved = calculatedStatus === REPORT_STATUSES.APPROVED;
  // const isNeedsAction = calculatedStatus === REPORT_STATUSES.NEEDS_ACTION;
  // const isApprover = approvers && approvers.some((a) => a.user.id === user.id);

  // const pendingOtherApprovals = (isNeedsAction || isSubmitted) && !isPendingApprover;
  // const pendingApprovalCount = approvers ? approvers.filter((a) => !a.status || a.status === 'needs_action').length : 0;

  const reviewPages = pages.filter(({ review }) => Boolean(!review));

  return (
    <>
      <Container skipTopPadding className="margin-bottom-0 padding-top-2 padding-bottom-5" skipBottomPadding paddingY={0}>
        {error && (
          <Alert noIcon className="margin-y-4" type="error">
            <b>Error</b>
            <br />
            {error}
          </Alert>
        )}

        <Review
          // author={author}
          // approvers={approvers}
          // isCreator={isCreator}
          // isSubmitted={isSubmitted}
          // isApproved={isApproved}
          // isNeedsAction={isNeedsAction}
          // isApprover={isApprover}
          // pendingOtherApprovals={pendingOtherApprovals}
          // dateSubmitted={submittedAt}
          // onFormReview={onReview}
          pages={reviewPages}
          reviewItems={reviewPages.map((p) => ({
            id: p.path,
            title: p.label,
            content: p.reviewSection(),
          }))}
          // onSaveForm={onSaveForm}
          onSaveDraft={onSaveDraft}
          onSubmit={onSubmit}
          onUpdatePage={onUpdatePage}
          // pendingApprovalCount={pendingApprovalCount}
          // isCollaborator={isCollaborator}
        />

      </Container>
    </>
  );
};

ReviewSubmitSession.propTypes = {
  availableApprovers: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number,
      name: PropTypes.string,
    }),
  ).isRequired,
  onReview: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  error: PropTypes.string,
  isPendingApprover: PropTypes.bool.isRequired,
  formData: PropTypes.shape({
    userId: PropTypes.number,
    collabReportSpecialists: PropTypes.arrayOf(PropTypes.shape({
      specialistId: PropTypes.number,
    })).isRequired,
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
  onSaveForm: PropTypes.func.isRequired,
  onUpdatePage: PropTypes.func.isRequired,
  onSaveDraft: PropTypes.func.isRequired,
  pages: PropTypes.arrayOf(PropTypes.shape({
    review: PropTypes.bool,
    path: PropTypes.string,
    label: PropTypes.string,
    reviewSection: PropTypes.func,
  })).isRequired,
};

ReviewSubmitSession.defaultProps = {
  error: '',
};

export default ReviewSubmitSession;
