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
import { Alert, Grid } from '@trussworks/react-uswds';
import moment from 'moment';

import pages from './Pages';
import Navigator from '../../components/Navigator';

import './index.css';
import { NOT_STARTED } from '../../components/Navigator/constants';
import { REPORT_STATUSES } from '../../Constants';
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
  activityRecipientType: '',
  activityRecipients: [],
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
  status: REPORT_STATUSES.DRAFT,
};

// FIXME: default region until we have a way of changing on the frontend
const region = 1;
const pagesByPos = _.keyBy(pages.filter((p) => !p.review), (page) => page.position);
const defaultPageState = _.mapValues(pagesByPos, () => NOT_STARTED);

function ActivityReport({ match, user, location }) {
  const { params: { currentPage, activityReportId } } = match;
  const history = useHistory();
  const [error, updateError] = useState();
  const [loading, updateLoading] = useState(true);
  const [formData, updateFormData] = useState();
  const [initialAdditionalData, updateAdditionalData] = useState({});
  const [approvingManager, updateApprovingManager] = useState(false);
  const [canWrite, updateCanWrite] = useState(false);
  const [initialLastUpdated, updateInitialLastUpdated] = useState();
  const reportId = useRef();

  const showLastUpdatedTime = (location.state && location.state.showLastUpdatedTime) || false;

  useEffect(() => {
    // Clear history state once mounted and activityReportId changes. This prevents someone from
    // seeing a save message if they refresh the page after creating a new report.
    history.replace();
  }, [activityReportId, history]);

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
          apiCalls.push(
            Promise.resolve({ ...defaultValues, pageState: defaultPageState, userId: user.id }),
          );
        }

        const [recipients, collaborators, approvers, report] = await Promise.all(apiCalls);

        reportId.current = activityReportId;

        const isCollaborator = report.collaborators
          && report.collaborators.find((u) => u.id === user.id);
        const isAuthor = report.userId === user.id;
        const canWriteReport = isCollaborator || isAuthor;

        updateAdditionalData({ recipients, collaborators, approvers });
        updateFormData(report);
        updateApprovingManager(report.approvingManagerId === user.id);
        updateCanWrite(canWriteReport);

        if (showLastUpdatedTime) {
          updateInitialLastUpdated(moment(report.updatedAt));
        }

        updateError();
      } catch (e) {
        updateError('Unable to load activity report');
      } finally {
        updateLoading(false);
      }
    };
    fetch();
  }, [activityReportId, user.id, showLastUpdatedTime]);

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
    const defaultPage = formData.status === REPORT_STATUSES.DRAFT ? 'activity-summary' : 'review';
    return (
      <Redirect push to={`/activity-reports/${activityReportId}/${defaultPage}`} />
    );
  }

  const updatePage = (position) => {
    const page = pages.find((p) => p.position === position);
    const state = {};
    if (activityReportId === 'new' && reportId.current !== 'new') {
      state.showLastUpdatedTime = true;
    }
    history.replace(`/activity-reports/${reportId.current}/${page.path}`, state);
  };

  const onSave = async (data, newIndex) => {
    const { activityRecipientType, activityRecipients } = data;
    let updatedReport = false;
    if (canWrite) {
      if (reportId.current === 'new') {
        if (activityRecipientType && activityRecipients && activityRecipients.length > 0) {
          const savedReport = await createReport({ ...data, regionId: region }, {});
          reportId.current = savedReport.id;
          updatedReport = false;
        }
      } else {
        await saveReport(reportId.current, data, {});
        updatedReport = true;
      }
    }

    if (newIndex) {
      updatePage(newIndex);
    }
    return updatedReport;
  };

  const onFormSubmit = async (data) => {
    const report = await submitReport(reportId.current, data);
    updateFormData(report);
  };

  const onReview = async (data) => {
    const report = await reviewReport(reportId.current, data);
    updateFormData(report);
  };

  const reportCreator = { name: user.name, role: user.role };

  return (
    <div className="smart-hub-activity-report">
      <Helmet titleTemplate="%s - Activity Report - TTA Smart Hub" defaultTitle="TTA Smart Hub - Activity Report" />
      <Grid row className="flex-justify">
        <Grid col="auto">
          <h1 className="font-serif-2xl text-bold line-height-serif-2 margin-top-3 margin-bottom-5">New activity report for Region 14</h1>
        </Grid>
        <Grid col="auto" className="flex-align-self-center">
          {formData.status && (
            <div className="smart-hub-status-label bg-gray-5 padding-x-2 padding-y-105 font-sans-md text-bold">{formData.status}</div>
          )}
        </Grid>
      </Grid>
      <Navigator
        reportCreator={reportCreator}
        initialLastUpdated={initialLastUpdated}
        reportId={reportId.current}
        currentPage={currentPage}
        additionalData={initialAdditionalData}
        formData={formData}
        updateFormData={updateFormData}
        pages={pages}
        onFormSubmit={onFormSubmit}
        onSave={onSave}
        approvingManager={approvingManager}
        onReview={onReview}
      />
    </div>
  );
}

ActivityReport.propTypes = {
  match: ReactRouterPropTypes.match.isRequired,
  location: ReactRouterPropTypes.location.isRequired,
  user: PropTypes.shape({
    id: PropTypes.number,
    name: PropTypes.string,
    role: PropTypes.string,
  }).isRequired,
};

export default ActivityReport;
