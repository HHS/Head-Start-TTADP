import React, { useContext } from 'react';
import PropTypes from 'prop-types';
import { useFormContext } from 'react-hook-form';
import { useHistory } from 'react-router';
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
  const formatNeedsActionApprovers = () => {
    const approversList = Array.isArray(approvers) ? approvers : (approvers?.rows || []);
    const needActionApprovers = approversList.filter(
      (a) => a.status === REPORT_STATUSES.NEEDS_ACTION,
    );

    if (!needActionApprovers || needActionApprovers.length === 0) {
      return 'Changes have been requested for the Collaboration Report.';
    }

    const approverNames = needActionApprovers
      .filter((a) => a.user && a.user.fullName)
      .map((a) => a.user.fullName);

    if (approverNames.length === 0) {
      return 'Changes have been requested for the Collaboration Report.';
    }

    if (approverNames.length === 1) {
      return `${approverNames[0]} is requesting changes to the Collaboration Report.`;
    }

    if (approverNames.length === 2) {
      return `${approverNames[0]} and ${approverNames[1]} are requesting changes to the Collaboration Report.`;
    }

    // Multiple approvers (3 or more) - use Oxford comma
    const lastApprover = approverNames.pop();
    const otherApprovers = approverNames.join(', ');
    return `${otherApprovers}, and ${lastApprover} are requesting changes to the Collaboration Report.`;
  };

  if (isNeedsAction) {
    return (
      <Alert type="error" noIcon slim className="margin-bottom-4 no-print">
        <span className="text-bold">
          {formatNeedsActionApprovers()}
        </span>
        <br />
        Please review any manager notes below and resubmit for approval.
      </Alert>
    );
  }

  return (
    <Alert type="info" noIcon slim className="margin-bottom-4 no-print">
      <>
        <span className="text-bold">
          {author.fullName}
          {' '}
          has requested approval for this Collaboration report (
          <strong>
            {`${pendingApprovalCount} of
               ${approvers?.length || 0}`}
            {' '}
            reviews pending
          </strong>
          ).
        </span>
        <br />
        Please review all information, then select an approval status.
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
  dateSubmitted,
  pages,
  availableApprovers,
  reviewItems,
  isCreator,
  isCollaborator,
  isApprover,
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
  const FormComponent = (isApprover) ? ApproverReview : CreatorSubmit;

  const { watch, getValues } = useFormContext();
  const { user } = useContext(UserContext);
  const { id } = getValues();
  const history = useHistory();

  const otherManagerNotes = approverStatusList
    ? approverStatusList.filter((a) => a.user.id !== user.id && a.note) : null;
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
      <h2 className="font-family-serif">Review and submit</h2>

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
        <div className="margin-bottom-4">
          <Accordion
            bordered
            items={reviewItems}
            pages={pages.map((page) => ({
              ...page,
              onNavigation: () => {
                history.push(`/collaboration-reports/${id}/${page.path}`);
              },
            }))}
            multiselectable
            canEdit
          />
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
  isApprover: PropTypes.bool.isRequired,
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
  approverStatusList: [],
  dateSubmitted: null,
};

export default Review;
