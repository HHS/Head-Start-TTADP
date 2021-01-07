/*
  Activity report. Makes use of the navigator to split the long form into
  multiple pages. Each "page" is defined in the `./Pages` directory.
*/
import React, { useState, useEffect } from 'react';
import _ from 'lodash';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet';
import ReactRouterPropTypes from 'react-router-prop-types';
import { useHistory, Redirect } from 'react-router-dom';

import pages from './Pages';
import Navigator from '../../components/Navigator';

import './index.css';
import { NOT_STARTED } from '../../components/Navigator/constants';
import { submitReport, saveReport, getReport } from '../../fetchers/activityReports';

const defaultValues = {
  activityMethod: [],
  activityType: [],
  attachments: [],
  cdi: '',
  duration: '',
  endDate: null,
  grantees: [],
  numberOfParticipants: '',
  otherUsers: [],
  participantCategory: '',
  participants: [],
  programTypes: [],
  reason: [],
  requester: '',
  resourcesUsed: '',
  startDate: null,
  targetPopulations: [],
  topics: [],
};

const pagesByPos = _.keyBy(pages.filter((p) => !p.review), (page) => page.position);
const defaultPageState = _.mapValues(pagesByPos, () => NOT_STARTED);

function ActivityReport({ match }) {
  const { params: { currentPage, activityReportId } } = match;
  const history = useHistory();

  const [submitted, updateSubmitted] = useState(false);
  const [loading, updateLoading] = useState(true);
  const [initialPageState, updateInitialPageSate] = useState(defaultPageState);
  const [initialFormData, updateInitialFormData] = useState(defaultValues);
  const [initialAdditionalData, updateAdditionalData] = useState({});

  useEffect(() => {
    const fetch = async () => {
      if (activityReportId !== 'new') {
        const { report, pageState, additionalData } = await getReport(activityReportId);
        updateInitialFormData(report);
        updateInitialPageSate(pageState);
        updateAdditionalData(additionalData);
        updateLoading(false);
      } else {
        updateInitialFormData(defaultValues);
        updateInitialPageSate(defaultPageState);
        updateAdditionalData({});
        updateLoading(false);
      }
    };
    fetch();
  }, [activityReportId]);

  if (loading) {
    return (
      <div>
        loading...
      </div>
    );
  }

  if (!currentPage) {
    return (
      <Redirect push to={`/activity-reports/${activityReportId}/activity-summary`} />
    );
  }

  const onSave = async (data) => {
    await saveReport(activityReportId, data);
  };

  const onFormSubmit = async (data, extraData) => {
    // eslint-disable-next-line no-console
    console.log('Submit form data', data, extraData);
    await submitReport(activityReportId, data, extraData);
    updateSubmitted(true);
  };

  const updatePage = (position) => {
    const page = pages.find((p) => p.position === position);
    history.push(`/activity-reports/${activityReportId}/${page.path}`);
  };

  return (
    <>
      <Helmet titleTemplate="%s - Activity Report - TTA Smart Hub" defaultTitle="TTA Smart Hub - Activity Report" />
      <h1 className="new-activity-report">New activity report for Region 14</h1>
      <Navigator
        updatePage={updatePage}
        currentPage={currentPage}
        submitted={submitted}
        initialPageState={initialPageState}
        defaultValues={{ ...defaultValues, ...initialFormData }}
        pages={pages}
        additionalData={initialAdditionalData}
        onFormSubmit={onFormSubmit}
        onSave={onSave}
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
