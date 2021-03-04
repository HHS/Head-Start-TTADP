import React from 'react';
import { Helmet } from 'react-helmet';
import ReviewPage from './Review/ReviewPage';

const NextSteps = () => (
  <>
    <Helmet>
      <title>Next steps</title>
    </Helmet>
    <div>
      Next Steps
    </div>
  </>
);

NextSteps.propTypes = {};

const sections = [];

const ReviewSection = () => (
  <ReviewPage sections={sections} path="topics-resources" />
);

export default {
  position: 4,
  label: 'Next steps',
  path: 'next-steps',
  review: false,
  reviewSection: () => <ReviewSection />,
  render: () => (
    <NextSteps />
  ),
};
