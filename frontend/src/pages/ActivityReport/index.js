/*
  Activity report. Makes use of the navigator to split the long form into
  multiple pages. Each "page" is defined in the `./Pages` directory.
*/
import React, { useState } from 'react';
import _ from 'lodash';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet';
import ReactRouterPropTypes from 'react-router-prop-types';
import { useHistory, Redirect } from 'react-router-dom';

import pages from './Pages';
import Navigator from '../../components/Navigator';

import './index.css';
import { NOT_STARTED } from '../../components/Navigator/constants';
import { submitReport } from '../../fetchers/activityReports';

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

  const onFormSubmit = async (data, extraData) => {
    // eslint-disable-next-line no-console
    console.log('Submit form data', data, extraData);
    await submitReport(data, extraData);
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
