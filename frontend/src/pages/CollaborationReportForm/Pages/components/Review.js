import React, { useContext } from 'react';
import PropTypes from 'prop-types';
import { useFormContext } from 'react-hook-form';
import { Alert } from '@trussworks/react-uswds';
import { REPORT_STATUSES } from '@ttahub/common';
import { Accordion } from '../../../../components/Accordion';
import UserContext from '../../../../UserContext';
import IndicatesRequiredField from '../../../../components/IndicatesRequiredField';
import ApproverReview from './ApproverReview';
import CreatorSubmit from './CreatorSubmit';

const TopAlert = ({
  author,
  isNeedsAction,
  pendingApprovalCount,
  approvers,
}) => {
  const getNeedsActionApprovingMangers = () => {
    const approversList = Array.isArray(approvers) ? approvers : (approvers?.rows || []);
    const needActionApprovers = approversList.filter(
      (a) => a.status === REPORT_STATUSES.NEEDS_ACTION,
    );
    if (needActionApprovers && needActionApprovers.length > 0) {
      return needActionApprovers
        .filter((a) => a.user && a.user.fullName)
        .map((a) => a.user.fullName)
        .join(', ');
    }
    return '';
  };

  if (isNeedsAction) {
    return (
      <Alert type="error" noIcon slim className="margin-bottom-4 no-print">
        <span className="text-bold">
          The following approving manager(s) have requested changes to this collaboration report:
          {' '}
          {getNeedsActionApprovingMangers()}
        </span>
        <br />
        Please review the manager notes and re-submit for approval.
      </Alert>
    );
  }

  return (
    <Alert type="info" noIcon slim className="margin-bottom-4 no-print">
      <>
        <span className="text-bold">
          {author.fullName}
          {' '}
          has requested approval for this collaboration report (
          <strong>
            {`${pendingApprovalCount} of
               ${approvers?.length || 0}`}
            {' '}
            reviews pending
          </strong>
          ).
        </span>
        <br />
        Please review all information in each section before submitting.
      </>
    </Alert>
  );
};

TopAlert.propTypes = {
  author: PropTypes.shape({
    fullName: PropTypes.string,
  }).isRequired,
  isNeedsAction: PropTypes.bool.isRequired,
  pendingApprovalCount: PropTypes.number.isRequired,
  approvers: PropTypes.arrayOf(PropTypes.shape({
    status: PropTypes.string,
    user: PropTypes.shape({
      fullName: PropTypes.string,
    }),
  })).isRequired,
};

const Review = ({
  onFormReview,
  approverStatusList,
  pendingOtherApprovals,
  dateSubmitted,
  pages,
  availableApprovers,
  reviewItems,
  isCreator,
  isCollaborator,
  isSubmitted,
  onSaveForm,
  onUpdatePage,
  onSaveDraft,
  onSubmit,
  isNeedsAction,
  pendingApprovalCount,
  author,
  approvers,
}) => {
  const FormComponent = (isCreator || isCollaborator) ? CreatorSubmit : ApproverReview;

  const { watch } = useFormContext();
  const { user } = useContext(UserContext);

  const otherManagerNotes = approverStatusList
    ? approverStatusList.filter((a) => a.user.id !== user.id) : null;
  const thisApprovingManager = approverStatusList
    ? approverStatusList.filter((a) => a.user.id === user.id) : null;
  const hasBeenReviewed = thisApprovingManager
    && thisApprovingManager.length > 0
    && thisApprovingManager[0].status !== null;
  const hasReviewNote = thisApprovingManager
    && thisApprovingManager.length > 0
    && thisApprovingManager[0].note;

  const pageState = watch('pageState');
  const filtered = Object.entries(pageState || {}).filter(([, status]) => status !== 'Complete').map(([position]) => Number(position));
  // eslint-disable-next-line max-len
  const incompletePages = pages.filter((page) => filtered.includes(page.position)).map(({ label }) => label);
  const hasIncompletePages = incompletePages.length > 0;

  return (
    <>
      <h2 className="font-family-serif">{pendingOtherApprovals ? 'Pending other approvals' : 'Review and approve'}</h2>

      <IndicatesRequiredField />
      {isSubmitted && (
      <TopAlert
        pendingApprovalCount={pendingApprovalCount}
        isNeedsAction={isNeedsAction}
        author={author}
        approvers={approvers}
      />
      )}
      {reviewItems && reviewItems.length > 0 && (
        <div className="margin-bottom-3">
          <Accordion bordered items={reviewItems} multiselectable />
        </div>
      )}

      <FormComponent
        isCollaborator={isCollaborator}
        hasIncompletePages={hasIncompletePages}
        incompletePages={incompletePages}
        isCreator={isCreator}
        isSubmitted={isSubmitted}
        isNeedsAction={isNeedsAction}
        onFormReview={onFormReview}
        availableApprovers={availableApprovers}
        dateSubmitted={dateSubmitted}
        thisApprovingManager={thisApprovingManager}
        otherManagerNotes={otherManagerNotes}
        hasBeenReviewed={hasBeenReviewed}
        hasReviewNote={hasReviewNote}
        approverStatusList={approverStatusList}
        onSaveForm={onSaveForm}
        onUpdatePage={onUpdatePage}
        onSaveDraft={onSaveDraft}
        onSubmit={onSubmit}
      />
    </>
  );
};

Review.propTypes = {
  onFormReview: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  dateSubmitted: PropTypes.string,
  pendingOtherApprovals: PropTypes.bool,
  approverStatusList: PropTypes.arrayOf(PropTypes.shape({
    approver: PropTypes.string,
    status: PropTypes.string,
  })),
  pages: PropTypes.arrayOf(PropTypes.shape({
    state: PropTypes.string,
    review: PropTypes.bool,
    label: PropTypes.string,
  })).isRequired,
  availableApprovers: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.number,
    name: PropTypes.string,
  })).isRequired,
  reviewItems: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    content: PropTypes.node.isRequired,
  })).isRequired,
  isCollaborator: PropTypes.bool.isRequired,
  isCreator: PropTypes.bool.isRequired,
  isSubmitted: PropTypes.bool.isRequired,
  onUpdatePage: PropTypes.func.isRequired,
  onSaveForm: PropTypes.func.isRequired,
  onSaveDraft: PropTypes.func.isRequired,
  isNeedsAction: PropTypes.bool.isRequired,
  author: PropTypes.shape({
    fullName: PropTypes.string,
  }).isRequired,
  pendingApprovalCount: PropTypes.number.isRequired,
  approvers: PropTypes.arrayOf(PropTypes.shape({
    status: PropTypes.string,
    user: PropTypes.shape({
      fullName: PropTypes.string,
    }),
  })).isRequired,
};

Review.defaultProps = {
  pendingOtherApprovals: false,
  approverStatusList: [],
  dateSubmitted: null,
};

export default Review;
