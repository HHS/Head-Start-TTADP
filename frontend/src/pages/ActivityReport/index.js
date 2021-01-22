/*
  Activity report. Makes use of the navigator to split the long form into
  multiple pages. Each "page" is defined in the `./Pages` directory.
*/
import React, { useState, useEffect, useRef } from 'react';
import _ from 'lodash';
import { Helmet } from 'react-helmet';
import ReactRouterPropTypes from 'react-router-prop-types';
import { useHistory, Redirect } from 'react-router-dom';
import { Alert } from '@trussworks/react-uswds';

import pages from './Pages';
import Navigator from '../../components/Navigator';

import './index.css';
import { NOT_STARTED } from '../../components/Navigator/constants';
import {
  submitReport,
  saveReport,
  getReport,
  getRecipients,
  createReport,
  getCollaborators,
  fetchApprovers,
} from '../../fetchers/activityReports';

const defaultValues = {
  deliveryMethod: [],
  activityType: [],
  attachments: [],
  context: '',
  collaborators: [],
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

// default region until we have a way of changing on the frontend
const region = 1;
const pagesByPos = _.keyBy(pages.filter((p) => !p.review), (page) => page.position);
const defaultPageState = _.mapValues(pagesByPos, () => NOT_STARTED);

function ActivityReport({ match }) {
  const { params: { currentPage, activityReportId } } = match;
  const history = useHistory();
  const [submitted, updateSubmitted] = useState(false);
  const [error, updateError] = useState();
  const [loading, updateLoading] = useState(true);
  const [initialFormData, updateInitialFormData] = useState(defaultValues);
  const [initialAdditionalData, updateAdditionalData] = useState({});
  const reportId = useRef(activityReportId);

  useEffect(() => {
    const fetch = async () => {
      try {
        const apiCalls = [
          getRecipients(),
          getCollaborators(region),
          fetchApprovers(region),
        ];

        if (activityReportId !== 'new') {
          apiCalls.push(getReport(activityReportId));
        } else {
          apiCalls.push(Promise.resolve({ ...defaultValues, pageState: defaultPageState }));
        }

        const [recipients, collaborators, approvers, report] = await Promise.all(apiCalls);
        updateAdditionalData({ recipients, collaborators, approvers });
        updateInitialFormData(report);
        updateError();
      } catch (e) {
        updateError('Unable to load activity report');
      } finally {
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

  if (error) {
    return (
      <Alert type="error">
        {error}
      </Alert>
    );
  }

  if (!currentPage) {
    return (
      <Redirect push to={`/activity-reports/${activityReportId}/activity-summary`} />
    );
  }

  const onSave = async (data) => {
    const { activityRecipientType, activityRecipients } = data;
    if (reportId.current === 'new') {
      if (activityRecipientType && activityRecipients && activityRecipients.length > 0) {
        const savedReport = await createReport({ ...data, regionId: region }, {});
        reportId.current = savedReport.id;
        return true;
      }
    } else {
      await saveReport(reportId.current, data, {});
      return true;
    }
    return false;
  };

  const onFormSubmit = async (data) => {
    // eslint-disable-next-line no-console
    console.log('Submit form data', data);
    await submitReport(reportId.current, data);
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
        additionalData={initialAdditionalData}
        initialData={{ ...defaultValues, ...initialFormData }}
        pages={pages}
        onFormSubmit={onFormSubmit}
        onSave={onSave}
      />
    </>
  );
}

ActivityReport.propTypes = {
  match: ReactRouterPropTypes.match.isRequired,
};

export default ActivityReport;
