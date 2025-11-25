/* eslint-disable max-len */
import React, { useMemo, useContext } from 'react';
import isAdmin from '../permissions';
import pages from '../pages/SessionForm/pages';
import ReviewSubmitSession from '../pages/SessionForm/components/ReviewSubmit';
import UserContext from '../UserContext';
import { TRAINING_EVENT_ORGANIZER } from '../Constants';

const createReviewPage = (applicationPages) => {
  // don't modify original array
  const lastPage = [...applicationPages].pop();

  if (!lastPage) {
    return null;
  }

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
  const facilitation = formData?.facilitation || '';

  const isRegionalNoNationalCenters = useMemo(() => TRAINING_EVENT_ORGANIZER.REGIONAL_TTA_NO_NATIONAL_CENTERS === eventOrganizer, [eventOrganizer]);
  const isRegionalWithNationalCenters = useMemo(() => TRAINING_EVENT_ORGANIZER.REGIONAL_PD_WITH_NATIONAL_CENTERS === eventOrganizer, [eventOrganizer]);
  const facilitationIncludesRegion = useMemo(() => facilitation === 'regional_tta_staff' || facilitation === 'both', [facilitation]);

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
    if (isAdminUser || isApprover) {
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
    } else if (isCollaborator && isRegionalWithNationalCenters && !facilitationIncludesRegion) {
      pagesWithReview = [
        pages.sessionSummary,
      ];
    } else if (isPoc && isRegionalWithNationalCenters && facilitationIncludesRegion) {
      pagesWithReview = [
        pages.sessionSummary,
        pages.participants,
        pages.supportingAttachments,
        pages.nextSteps,
      ];
    } else if (isPoc && isRegionalWithNationalCenters && !facilitationIncludesRegion) {
      pagesWithReview = [
        pages.participants,
        pages.supportingAttachments,
        pages.nextSteps,
      ];
    } else {
      pagesWithReview = [];
    }

    const reviewPage = createReviewPage(pagesWithReview);
    // in the case of an empty array of pages...
    if (reviewPage) {
      pagesWithReview.push(reviewPage);
    }
    return pagesWithReview;
  }, [
    facilitationIncludesRegion,
    isAdminUser,
    isApprover,
    isCollaborator,
    isPoc,
    isRegionalNoNationalCenters,
    isRegionalWithNationalCenters,
  ]);

  return {
    isPoc,
    isAdminUser,
    isCollaborator,
    isOwner,
    isApprover,
    applicationPages,
  };
}
