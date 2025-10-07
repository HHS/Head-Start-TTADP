/* eslint-disable max-len */
import React, { useMemo, useContext } from 'react';
import isAdmin from '../permissions';
import pages from '../pages/SessionForm/pages';
import sessionSummary from '../pages/SessionForm/pages/sessionSummary';
import ReviewSubmitSession from '../pages/SessionForm/components/ReviewSubmit';
import { REVIEW_SUBMIT_POSITION } from '../pages/SessionForm/components/constants';
import UserContext from '../UserContext';

const createReviewPage = (applicationPages) => ({
  position: REVIEW_SUBMIT_POSITION,
  review: true,
  label: 'Review and submit',
  path: 'review',
  render:
    (
      formData,
      onFormSubmit,
      additionalData,
      onReview,
      isApprover,
      isPendingApprover,
      onSave,
      _navigatorPages,
      reportCreator,
      lastSaveTime,
      onUpdatePage,
      onSaveDraft,
    ) => (
      <ReviewSubmitSession
        availableApprovers={additionalData.approvers}
        onSubmit={onFormSubmit}
        onSaveForm={onSave}
        onSaveDraft={onSaveDraft}
        onUpdatePage={onUpdatePage}
        onReview={onReview}
        isApprover={isApprover}
        isPendingApprover={isPendingApprover}
        lastSaveTime={lastSaveTime}
        formData={formData}
        pages={applicationPages}
        reportCreator={reportCreator}
      />
    ),
});

export default function useSessionFormRoleAndPages(formData) {
  const { user } = useContext(UserContext);
  const isAdminUser = useMemo(() => isAdmin(user), [user]);

  const {
    isPoc,
    isCollaborator,
    isOwner,
  } = useMemo(() => {
    let isPocUser = false;
    let isCollaboratorUser = false;
    let isOwnerUser = false;
    if (formData && formData.event) {
      if ((formData.event.pocIds && formData.event.pocIds.includes(user.id))) {
        isPocUser = true;
      }

      if (formData.event.collaboratorIds && formData.event.collaboratorIds.includes(user.id)) {
        isCollaboratorUser = true;
      }

      if (formData.event.ownerId && formData.event.ownerId === user.id) {
        isOwnerUser = true;
      }
    }
    return {
      isPoc: isPocUser,
      isCollaborator: isCollaboratorUser,
      isOwner: isOwnerUser,
    };
  }, [formData, user.id]);

  const applicationPages = useMemo(() => {
    let pagesWithReview = [];
    if (isAdminUser) {
      pagesWithReview = [
        pages.sessionSummary,
        pages.participants,
        pages.supportingAttachments,
        pages.nextSteps,
      ];
    } if (isPoc) {
      pagesWithReview = [
        pages.participants,
        pages.supportingAttachments,
        pages.nextSteps,
      ];
    } else {
      pagesWithReview = [sessionSummary];
    }

    const reviewPage = createReviewPage(pagesWithReview);
    pagesWithReview.push(reviewPage);

    return pagesWithReview;
  }, [isAdminUser, isPoc]);

  return {
    isPoc,
    isAdminUser,
    isCollaborator,
    isOwner,
    applicationPages,
  };
}
