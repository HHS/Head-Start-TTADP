import React from 'react';
import activitySummary from './activitySummary';
import topicsResources from './topicsResources';
import nextSteps from './nextSteps';
import goalsObjectives from './goalsObjectives';
import ReviewSubmit from './Review';

/*
  Note these are not react nodes but objects used by the navigator to render out
  each page of the activity report.
*/
const pages = [
  activitySummary,
  topicsResources,
  goalsObjectives,
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
      allComplete,
      formData,
      onSubmit,
      additionalData,
      onReview,
      approvingManager,
      reportCreator,
    ) => (
      <ReviewSubmit
        approvers={additionalData.approvers}
        allComplete={allComplete}
        onSubmit={onSubmit}
        onReview={onReview}
        approvingManager={approvingManager}
        reviewItems={
          pages.map((p) => ({
            id: p.path,
            title: p.label,
            content: p.reviewSection(),
          }))
        }
        formData={formData}
        reportCreator={reportCreator}
      />
    ),
};

export default [...pages, reviewPage];
