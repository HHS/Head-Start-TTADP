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
import {
  submitReport, saveReport, getReport, getRecipients, createReport,
} from '../../fetchers/activityReports';

const defaultValues = {
  'activity-method': [],
  'activity-type': [],
  attachments: [],
  context: '',
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
  const [error, updateError] = useState();
  const [loading, updateLoading] = useState(true);
  const [initialFormData, updateInitialFormData] = useState(defaultValues);
  const [initialAdditionalData, updateAdditionalData] = useState({});
  const reportId = useRef(activityReportId);

  useEffect(() => {
    const fetch = async () => {
      try {
        const recipients = await getRecipients();
        updateAdditionalData({ recipients });
        if (activityReportId !== 'new') {
          const report = await getReport(activityReportId);
          updateInitialFormData(report);
        } else {
          updateInitialFormData({ ...defaultValues, pageState: defaultPageState });
        }
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
        const savedReport = await createReport(data, {});
        reportId.current = savedReport.id;
        return true;
      }
    } else {
      await saveReport(reportId.current, data, {});
      return true;
    }
    return false;
  };

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
