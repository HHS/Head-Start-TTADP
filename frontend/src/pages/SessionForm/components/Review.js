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
// import ApproverReview from '../../CollaborationReportForm/Pages/components/ApproverReview';
// import CreatorSubmit from '../../CollaborationReportForm/Pages/components/CreatorSubmit';

const TopAlert = ({
  author,
  isNeedsAction,
  approver,
}) => {
  if (isNeedsAction) {
    return (
      <Alert type="error" noIcon slim className="margin-bottom-4 no-print">
        {approver.user.fullName}
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
        {author.fullName}
        {' '}
        has requested approval for this session report.
        {' '}
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
  approver: PropTypes.shape({
    status: PropTypes.string,
    user: PropTypes.shape({
      fullName: PropTypes.string,
    }),
  }).isRequired,
};

const Review = ({
  reviewItems,
  pages,

  // onFormReview,
  // approverStatusList,

  // availableApprovers,

  // isCreator,
  // isCollaborator,
  // isApprover,
  // isSubmitted,
  // onSaveForm,
  onUpdatePage,
  onSaveDraft,
  onSubmit,
  // isNeedsAction,
  // pendingApprovalCount,
  // author,
  // approvers,
  reviewSubmitPagePosition,
}) => {
  const FormComponent = Submit;

  const { getValues } = useFormContext();
  // const { user } = useContext(UserContext);
  const { id, eventId } = getValues();
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
      {/* {isSubmitted && (
      <TopAlert
        pendingApprovalCount={pendingApprovalCount}
        isNeedsAction={isNeedsAction}
        author={author}
        approvers={approvers}
      />
      )} */}
      {reviewItems && reviewItems.length > 0 && (
        <div className="margin-bottom-4">
          <Accordion
            bordered
            items={reviewItems}
            pages={pages.map((page) => ({
              ...page,
              onNavigation: () => {
                history.push(`/training-report/${eventId}/session/${id}/${page.path}`);
              },
            }))}
            multiselectable
            canEdit
          />
        </div>
      )}

      <FormComponent
        onSaveDraft={onSaveDraft}
        onUpdatePage={onUpdatePage}
        onSubmit={onSubmit}
        reviewSubmitPagePosition={reviewSubmitPagePosition}
        pages={pages}
      />
    </>
  );
};

Review.propTypes = {
  // onFormReview: PropTypes.func.isRequired,
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
  reviewItems: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    content: PropTypes.node.isRequired,
  })).isRequired,
  // isCollaborator: PropTypes.bool.isRequired,
  // isCreator: PropTypes.bool.isRequired,
  // isSubmitted: PropTypes.bool.isRequired,
  // isApprover: PropTypes.bool.isRequired,
  onUpdatePage: PropTypes.func.isRequired,
  // onSaveForm: PropTypes.func.isRequired,
  onSaveDraft: PropTypes.func.isRequired,
  // isNeedsAction: PropTypes.bool.isRequired,
  author: PropTypes.shape({
    fullName: PropTypes.string,
  }).isRequired,
  reviewSubmitPagePosition: PropTypes.number.isRequired,
  // pendingApprovalCount: PropTypes.number.isRequired,
  // approvers: PropTypes.arrayOf(PropTypes.shape({
  //   status: PropTypes.string,
  //   user: PropTypes.shape({
  //     fullName: PropTypes.string,
  //   }),
  // })).isRequired,
};

// Review.defaultProps = {
//   approverStatusList: [],
//   dateSubmitted: null,
// };

export default Review;
