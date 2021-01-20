import React from 'react';
import { Helmet } from 'react-helmet';

const GoalsObjectives = () => (
  <>
    <Helmet>
      <title>Goals and objectives</title>
    </Helmet>
    <div>
      Goals and objectives
    </div>
  </>
);

GoalsObjectives.propTypes = {};
const sections = [];

export default {
  position: 3,
  label: 'Goals and objectives',
  path: 'goals-objectives',
  review: false,
  sections,
  render: () => (
    <GoalsObjectives />
  ),
};
