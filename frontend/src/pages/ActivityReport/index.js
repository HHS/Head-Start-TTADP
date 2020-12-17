/*
  Activity report. Makes use of the navigator to split the long form into
  multiple pages. Each "page" is defined in the `./Pages` directory. To add
  a new page define a new "pages" array item with a label and renderForm function
  that accepts a react-hook-form useForm object as an argument (see
  https://react-hook-form.com/api/)
*/
import React, { useState } from 'react';
import _ from 'lodash';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet';
import ReactRouterPropTypes from 'react-router-prop-types';
import { useHistory, Redirect } from 'react-router-dom';

import ActivitySummary from './Pages/ActivitySummary';
import TopicsResources from './Pages/TopicsResources';
import NextSteps from './Pages/NextSteps';
import ReviewSubmit from './Pages/ReviewSubmit';
import GoalsObjectives from './Pages/GoalsObjectives';
import Navigator from '../../components/Navigator';

import './index.css';
import { NOT_STARTED } from '../../components/Navigator/constants';

const pages = [
  {
    position: 1,
    label: 'Activity summary',
    path: 'activity-summary',
    render: (hookForm) => {
      const {
        register, watch, setValue, getValues, control,
      } = hookForm;
      return (
        <ActivitySummary
          register={register}
          watch={watch}
          setValue={setValue}
          getValues={getValues}
          control={control}
        />
      );
    },
  },
  {
    position: 2,
    label: 'Topics and resources',
    path: 'topics-resources',
    render: (hookForm) => {
      const { control, register } = hookForm;
      return (
        <TopicsResources
          register={register}
          control={control}
        />
      );
    },
  },
  {
    position: 3,
    label: 'Goals and objectives',
    path: 'goals-objectives',
    render: () => (
      <GoalsObjectives />
    ),
  },
  {
    position: 4,
    label: 'Next steps',
    path: 'next-steps',
    render: () => (
      <NextSteps />
    ),
  },
  {
    position: 5,
    review: true,
    label: 'Review and submit',
    path: 'review',
    render: (allComplete, onSubmit) => (
      <ReviewSubmit
        allComplete={allComplete}
        onSubmit={onSubmit}
      />
    ),
  },
];

const defaultValues = {
  'activity-method': [],
  'activity-type': [],
  attachments: [],
  cdi: '',
  duration: '',
  'end-date': null,
  grantees: [],
  'number-of-participants': '',
  'other-users': [],
  'participant-category': '',
  participants: [],
  'program-types': [],
  reason: [],
  requester: '',
  'resources-used': '',
  'start-date': null,
  'target-populations': [],
  topics: [],
};

const pagesByPos = _.keyBy(pages.filter((p) => !p.review), (page) => page.position);
const initialPageState = _.mapValues(pagesByPos, () => NOT_STARTED);

function ActivityReport({ initialData, match }) {
  const [submitted, updateSubmitted] = useState(false);
  const history = useHistory();
  const { params: { currentPage } } = match;

  const onFormSubmit = (data) => {
    // eslint-disable-next-line no-console
    console.log('Submit form data', data);
    updateSubmitted(true);
  };

  const updatePage = (position) => {
    const page = pages.find((p) => p.position === position);
    history.push(`/activity-reports/${page.path}`);
  };

  if (!currentPage) {
    return (
      <Redirect to="/activity-reports/activity-summary" />
    );
  }

  return (
    <>
      <Helmet titleTemplate="%s - Activity Report - TTA Smart Hub" defaultTitle="TTA Smart Hub - Activity Report" />
      <h1 className="new-activity-report">New activity report for Region 14</h1>
      <Navigator
        updatePage={updatePage}
        currentPage={currentPage}
        submitted={submitted}
        initialPageState={initialPageState}
        defaultValues={{ ...defaultValues, ...initialData }}
        pages={pages}
        onFormSubmit={onFormSubmit}
      />
    </>
  );
}

ActivityReport.propTypes = {
  initialData: PropTypes.shape({}),
  match: ReactRouterPropTypes.match.isRequired,
};

ActivityReport.defaultProps = {
  initialData: {},
};

export default ActivityReport;
