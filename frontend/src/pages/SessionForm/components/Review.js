import React from 'react';
// import React, { useContext } from 'react';
import PropTypes from 'prop-types';
import { useFormContext } from 'react-hook-form';
import { useHistory } from 'react-router';
import { Alert } from '@trussworks/react-uswds';
// import { REPORT_STATUSES } from '@ttahub/common';
import { Accordion } from '../../../components/Accordion';
// import UserContext from '../../../UserContext';
import IndicatesRequiredField from '../../../components/IndicatesRequiredField';
import Submit from './Submit';
import Approve from './Approve';
import NeedsAction from './NeedsAction';

const TopAlert = ({
  isNeedsAction,
  approver,
  submitter,
}) => {
  if (isNeedsAction) {
    return (
      <Alert type="error" noIcon slim className="margin-bottom-4 no-print">
        {approver.fullName}
        {' '}
        has requested changes to this session.
        {' '}
        Please review any manager notes below and resubmit for approval.
      </Alert>
    );
  }

  return (
    <Alert type="info" noIcon slim className="margin-bottom-4 no-print">
      <>
        {submitter}
        {' '}
        has requested approval for this session report.
        {' '}
        Please review all information, then select an approval status.
      </>
    </Alert>
  );
};

TopAlert.propTypes = {
  submitter: PropTypes.string.isRequired,
  isNeedsAction: PropTypes.bool.isRequired,
  approver: PropTypes.shape({
    fullName: PropTypes.string,
  }).isRequired,
};

const Review = ({
  reviewItems,
  pages,

  onFormReview,
  // approverStatusList,

  // availableApprovers,

  // isCreator,
  // isCollaborator,
  isApprover,
  approver,
  isSubmitted,
  // onSaveForm,
  onUpdatePage,
  onSaveDraft,
  onSubmit,
  isNeedsAction,
  // pendingApprovalCount,
  // author,
  // approvers,
  reviewSubmitPagePosition,
}) => {
  let FormComponent = Submit;

  if (isApprover && !isNeedsAction) {
    FormComponent = Approve;
  }

  if (isNeedsAction) {
    FormComponent = NeedsAction;
  }

  const { getValues } = useFormContext();
  // const { user } = useContext(UserContext);
  const { id, eventId, submitter } = getValues();
  const history = useHistory();

  // const otherManagerNotes = approverStatusList
  //   ? approverStatusList.filter((a) => a.user.id !== user.id && a.note) : null;
  // const thisApprovingManager = approverStatusList
  //   ? approverStatusList.filter((a) => a.user.id === user.id) : null;
  // const hasBeenReviewed = thisApprovingManager
  //   && thisApprovingManager.length > 0
  //   && thisApprovingManager[0].status !== null;
  // const hasReviewNote = thisApprovingManager
  //   && thisApprovingManager.length > 0
  //   && thisApprovingManager[0].note;

  return (
    <>
      <h2 className="font-family-serif">Review and submit</h2>

      <IndicatesRequiredField />
      {isSubmitted && (
      <TopAlert
        isNeedsAction={isNeedsAction}
        submitter={submitter}
        approver={approver}
      />
      )}
      {reviewItems && reviewItems.length > 0 && (
        <div className="margin-bottom-4">
          <Accordion
            bordered
            items={reviewItems.map((item) => ({
              ...item,
              expanded: isApprover,
            }))}
            pages={pages.map((page) => ({
              ...page,
              onNavigation: () => {
                history.push(`/training-report/${eventId}/session/${id}/${page.path}`);
              },
            }))}
            multiselectable
            canEdit={!isApprover}
            doesStartExpanded={isApprover}
          />
        </div>
      )}

      <FormComponent
        onSaveDraft={onSaveDraft}
        onUpdatePage={onUpdatePage}
        onSubmit={onSubmit}
        reviewSubmitPagePosition={reviewSubmitPagePosition}
        pages={pages}
        onFormReview={onFormReview}
      />
    </>
  );
};

Review.propTypes = {
  onFormReview: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  // dateSubmitted: PropTypes.string,
  // approverStatusList: PropTypes.arrayOf(PropTypes.shape({
  //   approver: PropTypes.string,
  //   status: PropTypes.string,
  // })),
  pages: PropTypes.arrayOf(PropTypes.shape({
    state: PropTypes.string,
    review: PropTypes.bool,
    label: PropTypes.string,
  })).isRequired,
  // availableApprovers: PropTypes.arrayOf(PropTypes.shape({
  //   id: PropTypes.number,
  //   name: PropTypes.string,
  // })).isRequired,
  approver: PropTypes.shape({
    id: PropTypes.number,
    fullName: PropTypes.string,
  }).isRequired,
  reviewItems: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    content: PropTypes.node.isRequired,
  })).isRequired,
  // isCollaborator: PropTypes.bool.isRequired,
  // isCreator: PropTypes.bool.isRequired,
  isSubmitted: PropTypes.bool.isRequired,
  isApprover: PropTypes.bool.isRequired,
  onUpdatePage: PropTypes.func.isRequired,
  // onSaveForm: PropTypes.func.isRequired,
  onSaveDraft: PropTypes.func.isRequired,
  isNeedsAction: PropTypes.bool.isRequired,
  author: PropTypes.shape({
    fullName: PropTypes.string,
  }).isRequired,
  reviewSubmitPagePosition: PropTypes.number.isRequired,
};

// Review.defaultProps = {
//   approverStatusList: [],
//   dateSubmitted: null,
// };

export default Review;
