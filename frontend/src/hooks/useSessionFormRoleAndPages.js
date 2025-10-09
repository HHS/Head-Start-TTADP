/* eslint-disable max-len */
import React, { useMemo, useContext } from 'react';
import isAdmin from '../permissions';
import pages from '../pages/SessionForm/pages';
import sessionSummary from '../pages/SessionForm/pages/sessionSummary';
import ReviewSubmitSession from '../pages/SessionForm/components/ReviewSubmit';
import UserContext from '../UserContext';
import { TRAINING_EVENT_ORGANIZER } from '../Constants';

const createReviewPage = (applicationPages) => {
  // don't modify original array
  const lastPage = [...applicationPages].pop();
  const position = lastPage.position + 1;

  return {
    position,
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
        reviewSubmitPagePosition={position}
      />
    ),
  };
};

export default function useSessionFormRoleAndPages(formData) {
  const eventOrganizer = formData?.event?.data?.eventOrganizer || '';
  const isRegionalNoNationalCenters = useMemo(() => TRAINING_EVENT_ORGANIZER.REGIONAL_TTA_NO_NATIONAL_CENTERS === eventOrganizer, [eventOrganizer]);

  const { user } = useContext(UserContext);
  const isAdminUser = useMemo(() => isAdmin(user), [user]);

  const {
    isPoc,
    isCollaborator,
    isOwner,
    isApprover,
  } = useMemo(() => {
    let isPocUser = false;
    let isCollaboratorUser = false;
    let isOwnerUser = false;
    let isApproverUser = false;
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

    if (formData && formData.approverId) {
      isApproverUser = Number(formData.approverId) === user.id;
    }

    return {
      isPoc: isPocUser,
      isCollaborator: isCollaboratorUser,
      isOwner: isOwnerUser,
      isApprover: isApproverUser,
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
    } else if (isCollaborator && isRegionalNoNationalCenters) {
      pagesWithReview = [
        pages.sessionSummary,
        pages.participants,
        pages.supportingAttachments,
        pages.nextSteps,
      ];
    } else if (isPoc) {
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
  }, [isAdminUser, isCollaborator, isPoc, isRegionalNoNationalCenters]);

  return {
    isPoc,
    isAdminUser,
    isCollaborator,
    isOwner,
    isApprover,
    applicationPages,
  };
}
