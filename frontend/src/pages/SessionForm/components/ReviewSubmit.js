/* eslint-disable max-len */
import React, { useContext, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useFormContext } from 'react-hook-form';
import { Alert } from '@trussworks/react-uswds';
import { REPORT_STATUSES } from '@ttahub/common';
import Review from './Review';
import Container from '../../../components/Container';
import UserContext from '../../../UserContext';
import isAdmin from '../../../permissions';

const ReviewSubmitSession = ({
  onReview,
  formData,
  error,
  onUpdatePage,
  onSaveDraft,
  onSubmit,
  pages,
  reviewSubmitPagePosition,
}) => {
  const {
    status,
    approverId,
    approver,
    event,
  } = formData;

  const { user } = useContext(UserContext);
  const { register, watch } = useFormContext();
  const isAdminUser = useMemo(() => isAdmin(user), [user]);

  const pocComplete = watch('pocComplete');
  const ownerComplete = watch('ownerComplete');
  const isSubmitted = !!(pocComplete && ownerComplete && approverId);

  // The logic for redirecting users has been hoisted all the way up the
  // fetch at the top level CollaborationForm/index.js file

  // We only care if the report has been submitted
  // or if the current user is an approver, whether or not
  // the report has been approved

  const isNeedsAction = status === REPORT_STATUSES.NEEDS_ACTION;
  const isApprover = Number(approverId) === user.id;

  const isPoc = (event?.pocIds || []).includes(user.id);
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

        <input
          type="hidden"
          name="reviewStatus"
          id="reviewStatus"
          ref={register()}
          value={isSubmitted ? REPORT_STATUSES.SUBMITTED : REPORT_STATUSES.DRAFT}
        />

        <Review
          isAdmin={isAdminUser}
          isSubmitted={isSubmitted}
          isNeedsAction={isNeedsAction}
          isApprover={isApprover}
          approver={approver}
          onFormReview={onReview}
          pages={reviewPages}
          reviewItems={reviewPages.map((p) => ({
            id: p.path,
            title: p.label,
            content: p.reviewSection(),
          }))}
          onSaveDraft={onSaveDraft}
          onSubmit={onSubmit}
          onUpdatePage={onUpdatePage}
          reviewSubmitPagePosition={reviewSubmitPagePosition}
          isPoc={isPoc}
        />

      </Container>
    </>
  );
};

ReviewSubmitSession.propTypes = {
  reviewSubmitPagePosition: PropTypes.number.isRequired,
  onReview: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  error: PropTypes.string,
  formData: PropTypes.shape({
    event: PropTypes.shape({
      pocIds: PropTypes.arrayOf(PropTypes.number),
    }),
    submitted: PropTypes.bool,
    approver: PropTypes.shape({
      id: PropTypes.number,
      fullName: PropTypes.string,
    }),
    status: PropTypes.string,
    approverId: PropTypes.number,
    userId: PropTypes.number,
    additionalNotes: PropTypes.string,
    calculatedStatus: PropTypes.string,
    submissionStatus: PropTypes.string,
    submittedAt: PropTypes.string,
    author: PropTypes.shape({
      name: PropTypes.string,
      fullName: PropTypes.string,
      id: PropTypes.number,
    }),
    id: PropTypes.number,
    displayId: PropTypes.string,
  }).isRequired,
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
