import React from 'react';
import activitySummary from './activitySummary';
import supportingAttachments from './supportingAttachments';
import nextSteps from './nextSteps';
import goalsObjectives from './goalsObjectives';
import ReviewSubmit from './Review';

/*
  Note these are not react nodes but objects used by the navigator to render out
  each page of the activity report.
*/
const pages = [
  activitySummary,
  goalsObjectives,
  supportingAttachments,
  nextSteps,
];

/*
  Each page defines the sections/fields to show in the review section. Each page
  is added to the review page as a "reviewItem" below.
*/
const reviewPage = {
  position: 5,
  review: true,
  label: 'Review and submit',
  path: 'review',
  render:
    (
      formData,
      onSubmit,
      additionalData,
      onReview,
      isApprover,
      isPendingApprover,
      onResetToDraft,
      onSaveForm,
      allPages,
      reportCreator,
      lastSaveTime,
    ) => (
      <ReviewSubmit
        availableApprovers={additionalData.availableApprovers}
        onSubmit={onSubmit}
        onSaveForm={onSaveForm}
        onReview={onReview}
        isApprover={isApprover}
        isPendingApprover={isPendingApprover}
        onResetToDraft={onResetToDraft}
        lastSaveTime={lastSaveTime}
        reviewItems={
          pages.map((p) => ({
            id: p.path,
            title: p.label,
            content: p.reviewSection(formData.activityRecipientType),
          }))
        }
        formData={formData}
        pages={allPages}
        reportCreator={reportCreator}
      />
    ),
};

export default [...pages, reviewPage];
