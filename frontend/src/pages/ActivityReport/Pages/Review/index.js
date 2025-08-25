import React, { useState, useContext } from 'react';
import { REPORT_STATUSES } from '@ttahub/common';
import moment from 'moment';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet';
import Submitter from './Submitter';
import Approver from './Approver';
import PrintSummary from '../PrintSummary';
import './index.scss';
import AppLoadingContext from '../../../../AppLoadingContext';
import UserContext from '../../../../UserContext';

const ReviewSubmit = ({
  onSubmit,
  onReview,
  reviewItems,
  availableApprovers,
  isApprover,
  isPendingApprover,
  reportCreator,
  formData,
  onSaveForm,
  pages,
  lastSaveTime,
}) => {
  const { additionalNotes, calculatedStatus } = formData;
  const { setIsAppLoading, setAppLoadingText } = useContext(AppLoadingContext);
  const [reviewed, updateReviewed] = useState(false);
  const [error, updateError] = useState();

  const { user } = useContext(UserContext);

  const isCreator = user.id === formData.userId;
  const isDraft = formData.calculatedStatus === REPORT_STATUSES.DRAFT;
  const isCollaborator = formData.activityReportCollaborators
  && formData.activityReportCollaborators.find((u) => u.userId === user.id);

  const creatorOrCollaborator = (isCreator || !!isCollaborator);

  const onFormSubmit = async (data) => {
    try {
      await onSubmit(data);
      updateError();
    } catch (e) {
      updateError('Unable to submit report');
    }
  };

  const onFormReview = async (data) => {
    // we need to validate as we do on submit
    setIsAppLoading(true);
    setAppLoadingText('Submitting');
    try {
      await onReview(data);
      updateReviewed(true);
      updateError();
    } catch (e) {
      updateReviewed(false);
      updateError('Unable to review report');
    } finally {
      setIsAppLoading(false);
    }
  };

  const editing = calculatedStatus === REPORT_STATUSES.DRAFT
    || calculatedStatus === REPORT_STATUSES.NEEDS_ACTION;
  const items = editing ? reviewItems.map((ri) => ({
    ...ri,
    expanded: false,
  })) : reviewItems.map((ri) => ({
    ...ri,
    expanded: true,
  }));

  return (
    <>
      <Helmet>
        <title>Review and Submit</title>
      </Helmet>
      <PrintSummary reportCreator={reportCreator} />
      {(!isApprover || (isDraft && creatorOrCollaborator))
        && (
          <Submitter
            availableApprovers={availableApprovers}
            pages={pages}
            onFormSubmit={onFormSubmit}
            formData={formData}
            error={error}
            onSaveForm={onSaveForm}
            lastSaveTime={lastSaveTime}
            reviewItems={items || []}
          />
        )}
      {(isApprover && !isDraft)
        && (
          <Approver
            availableApprovers={availableApprovers}
            reviewed={reviewed}
            pages={pages}
            additionalNotes={additionalNotes}
            onFormReview={onFormReview}
            error={error}
            formData={formData}
            isPendingApprover={isPendingApprover}
            onFormSubmit={onFormSubmit}
            reviewItems={items || []}
          />
        )}
    </>
  );
};

ReviewSubmit.propTypes = {
  onSaveForm: PropTypes.func.isRequired,
  availableApprovers: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      name: PropTypes.string.isRequired,
    }),
  ).isRequired,
  onSubmit: PropTypes.func.isRequired,
  onReview: PropTypes.func.isRequired,
  isApprover: PropTypes.bool.isRequired,
  isPendingApprover: PropTypes.bool.isRequired,
  formData: PropTypes.shape({
    additionalNotes: PropTypes.string,
    calculatedStatus: PropTypes.string,
    submissionStatus: PropTypes.string,
    userId: PropTypes.number,
    activityReportCollaborators: PropTypes.arrayOf(PropTypes.shape({
      userId: PropTypes.number,
    })),
  }).isRequired,
  reportCreator: PropTypes.shape({
    name: PropTypes.string.isRequired,
    role: PropTypes.arrayOf(PropTypes.string),
  }).isRequired,
  reviewItems: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      content: PropTypes.node.isRequired,
    }),
  ).isRequired,
  pages: PropTypes.arrayOf(PropTypes.shape({
    review: PropTypes.bool,
    state: PropTypes.string,
    label: PropTypes.string,
  })).isRequired,
  lastSaveTime: PropTypes.instanceOf(moment),
};

ReviewSubmit.defaultProps = {
  lastSaveTime: undefined,
};

export default ReviewSubmit;
