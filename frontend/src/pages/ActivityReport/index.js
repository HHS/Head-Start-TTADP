/*
  Activity report. Makes use of the navigator to split the long form into
  multiple pages. Each "page" is defined in the `./Pages` directory.
*/
import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
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
  getApprovers,
  reviewReport,
} from '../../fetchers/activityReports';

// All new reports will show these two goals
const fakeGoals = [
  {
    name: 'This is the first fake goal. The buttons do not work.',
  },
  {
    name: 'This is the second fake goal. It has text that should wrap to the next line so you can see how the goals component handles long goals.',
  },
];

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
  participantCategory: '',
  participants: [],
  programTypes: [],
  reason: [],
  requester: '',
  resourcesUsed: '',
  startDate: null,
  targetPopulations: [],
  topics: [],
  approvingManagerId: null,
  additionalNotes: null,
  goals: fakeGoals,
};

// FIXME: default region until we have a way of changing on the frontend
const region = 1;
const pagesByPos = _.keyBy(pages.filter((p) => !p.review), (page) => page.position);
const defaultPageState = _.mapValues(pagesByPos, () => NOT_STARTED);

function ActivityReport({ match, user }) {
  const { params: { currentPage, activityReportId } } = match;
  const history = useHistory();
  const [status, updateStatus] = useState();
  const [error, updateError] = useState();
  const [loading, updateLoading] = useState(true);
  const [initialFormData, updateInitialFormData] = useState(defaultValues);
  const [initialAdditionalData, updateAdditionalData] = useState({});
  const [approvingManager, updateApprovingManager] = useState(false);
  const reportId = useRef();
  const { name, role } = user;
  const reportCreator = { name, role };

  useEffect(() => {
    const fetch = async () => {
      try {
        updateLoading(true);

        const apiCalls = [
          getRecipients(),
          getCollaborators(region),
          getApprovers(region),
        ];

        if (activityReportId !== 'new') {
          apiCalls.push(getReport(activityReportId));
        } else {
          apiCalls.push(Promise.resolve({ ...defaultValues, pageState: defaultPageState }));
        }

        const [recipients, collaborators, approvers, report] = await Promise.all(apiCalls);

        reportId.current = activityReportId;
        updateAdditionalData({ recipients, collaborators, approvers });
        updateInitialFormData(report);
        updateStatus(report.status || 'draft');
        updateApprovingManager(report.approvingManagerId === user.id);
        updateError();
      } catch (e) {
        updateError('Unable to load activity report');
      } finally {
        updateLoading(false);
      }
    };
    fetch();
  }, [activityReportId, user.id]);

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

  const updatePage = (position) => {
    const page = pages.find((p) => p.position === position);
    history.push(`/activity-reports/${reportId.current}/${page.path}`);
  };

  const onSave = async (data, newIndex) => {
    const { activityRecipientType, activityRecipients } = data;
    let saved = false;
    if (reportId.current === 'new') {
      if (activityRecipientType && activityRecipients && activityRecipients.length > 0) {
        const savedReport = await createReport({ ...data, regionId: region }, {});
        reportId.current = savedReport.id;
        saved = true;
      }
    } else {
      await saveReport(reportId.current, data, {});
      saved = true;
    }

    if (newIndex) {
      updatePage(newIndex);
    }
    return saved;
  };

  const onFormSubmit = async (data) => {
    const report = await submitReport(reportId.current, data);
    updateStatus(report.status);
  };

  const onReview = async (data) => {
    const report = await reviewReport(reportId.current, data);
    updateStatus(report.status);
  };

  return (
    <div className="smart-hub-activity-report">
      <Helmet titleTemplate="%s - Activity Report - TTA Smart Hub" defaultTitle="TTA Smart Hub - Activity Report" />
      <h1 className="new-activity-report">New activity report for Region 14</h1>
      <Navigator
        reportCreator={reportCreator}
        reportId={reportId.current}
        currentPage={currentPage}
        additionalData={initialAdditionalData}
        initialData={{ ...defaultValues, ...initialFormData }}
        pages={pages}
        onFormSubmit={onFormSubmit}
        onSave={onSave}
        status={status}
        approvingManager={approvingManager}
        onReview={onReview}
      />
    </div>
  );
}

ActivityReport.propTypes = {
  match: ReactRouterPropTypes.match.isRequired,
  user: PropTypes.shape({
    id: PropTypes.number,
    name: PropTypes.string,
    role: PropTypes.string,
  }).isRequired,
};

export default ActivityReport;
