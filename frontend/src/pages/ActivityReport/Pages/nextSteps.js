import React from 'react';
import { Helmet } from 'react-helmet';

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

export default {
  position: 4,
  label: 'Next steps',
  path: 'next-steps',
  review: false,
  sections,
  render: () => (
    <NextSteps />
  ),
};
