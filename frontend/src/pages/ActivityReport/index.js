/*
  Activity report. Makes use of the navigator to split the long form into
  multiple pages. Each "page" is defined in the `./Pages` directory.
*/
import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import {
  keyBy, mapValues, startCase, isEqual,
} from 'lodash';
import { Helmet } from 'react-helmet';
import ReactRouterPropTypes from 'react-router-prop-types';
import { useHistory, Redirect } from 'react-router-dom';
import { Alert, Grid } from '@trussworks/react-uswds';
import useDeepCompareEffect from 'use-deep-compare-effect';
import moment from 'moment';

import pages from './Pages';
import Navigator from '../../components/Navigator';

import './index.css';
import { NOT_STARTED } from '../../components/Navigator/constants';
import { REPORT_STATUSES, DECIMAL_BASE } from '../../Constants';
import { getRegionWithReadWrite } from '../../permissions';
import {
  submitReport,
  saveReport,
  getReport,
  getRecipients,
  createReport,
  getCollaborators,
  getApprovers,
  reviewReport,
  resetToDraft,
} from '../../fetchers/activityReports';

const defaultValues = {
  ECLKCResourcesUsed: [{ value: '' }],
  activityRecipientType: '',
  activityRecipients: [],
  activityType: [],
  additionalNotes: null,
  attachments: [],
  collaborators: [],
  context: '',
  deliveryMethod: null,
  duration: '',
  endDate: null,
  goals: [],
  recipientNextSteps: [],
  recipients: [],
  nonECLKCResourcesUsed: [{ value: '' }],
  numberOfParticipants: null,
  objectivesWithoutGoals: [],
  otherResources: [],
  participantCategory: '',
  participants: [],
  reason: [],
  requester: '',
  specialistNextSteps: [],
  startDate: null,
  calculatedStatus: REPORT_STATUSES.DRAFT,
  targetPopulations: [],
  topics: [],
  approvers: [],
};

const pagesByPos = keyBy(pages.filter((p) => !p.review), (page) => page.position);
const defaultPageState = mapValues(pagesByPos, () => NOT_STARTED);

/**
 * compares two objects using lodash "isEqual" and returns the difference
 * @param {*} object
 * @param {*} base
 * @returns {} containing any new keys/values
 */
export const findWhatsChanged = (object, base) => {
  function reduction(accumulator, current) {
    if (!object[current]) {
      return accumulator;
    }

    if (!isEqual(base[current], object[current])) {
      accumulator[current] = object[current];
    }

    return accumulator;
  }

  return Object.keys(object).reduce(reduction, {});
};

export const unflattenResourcesUsed = (array) => {
  if (!array) {
    return [];
  }

  return array.map((value) => ({ value }));
};

function ActivityReport({
  match, user, location, region,
}) {
  const { params: { currentPage, activityReportId } } = match;
  const history = useHistory();
  const [error, updateError] = useState();
  const [loading, updateLoading] = useState(true);
  const [formData, updateFormData] = useState();
  const [initialAdditionalData, updateAdditionalData] = useState({});
  const [isApprover, updateIsApprover] = useState(false);
  // If the user is one of the approvers on this report and is still pending approval.
  const [isPendingApprover, updateIsPendingApprover] = useState(false);
  const [editable, updateEditable] = useState(false);
  const [lastSaveTime, updateLastSaveTime] = useState();
  const [showValidationErrors, updateShowValidationErrors] = useState(false);
  const [errorMessage, updateErrorMessage] = useState();
  const reportId = useRef();

  const showLastUpdatedTime = (location.state && location.state.showLastUpdatedTime) || false;

  useEffect(() => {
    // Clear history state once mounted and activityReportId changes. This prevents someone from
    // seeing a save message if they refresh the page after creating a new report.
    history.replace();
  }, [activityReportId, history]);

  const convertReportToFormData = (fetchedReport) => {
    const ECLKCResourcesUsed = unflattenResourcesUsed(fetchedReport.ECLKCResourcesUsed);
    const nonECLKCResourcesUsed = unflattenResourcesUsed(fetchedReport.nonECLKCResourcesUsed);
    return { ...fetchedReport, ECLKCResourcesUsed, nonECLKCResourcesUsed };
  };

  useDeepCompareEffect(() => {
    const fetch = async () => {
      let report;

      try {
        updateLoading(true);
        if (activityReportId !== 'new') {
          const fetchedReport = await getReport(activityReportId);
          report = convertReportToFormData(fetchedReport);
        } else {
          report = {
            ...defaultValues,
            pageState: defaultPageState,
            userId: user.id,
            regionId: region || getRegionWithReadWrite(user),
          };
        }

        const apiCalls = [
          getRecipients(report.regionId),
          getCollaborators(report.regionId),
          getApprovers(report.regionId),
        ];

        const [recipients, collaborators, availableApprovers] = await Promise.all(apiCalls);
        reportId.current = activityReportId;

        const isCollaborator = report.collaborators
          && report.collaborators.find((u) => u.id === user.id);
        const isAuthor = report.userId === user.id;

        // The report can be edited if its in draft OR needs_action state.
        const canWriteReport = (isCollaborator || isAuthor)
          && (report.calculatedStatus === REPORT_STATUSES.DRAFT
            || report.calculatedStatus === REPORT_STATUSES.NEEDS_ACTION);

        updateAdditionalData({ recipients, collaborators, availableApprovers });
        updateFormData(report);

        // ***Determine if the current user matches any of the approvers for this activity report.
        // If author or collab and the report is in EDIT state we are NOT currently an approver.
        const matchingApprover = report.approvers.filter((a) => a.User && a.User.id === user.id);

        if (matchingApprover && matchingApprover.length > 0 && !canWriteReport) {
          // This user is an approver on the report.
          updateIsApprover(true);

          // This user is a approver on the report and has a pending approval.
          if (matchingApprover[0].status === null || matchingApprover[0].status === 'pending') {
            updateIsPendingApprover(true);
          }
        }

        updateEditable(canWriteReport);

        if (showLastUpdatedTime) {
          updateLastSaveTime(moment(report.updatedAt));
        }

        updateError();
      } catch (e) {
        updateError('Unable to load activity report');
        // If the error was caused by an invalid region, we need a way to communicate that to the
        // component so we can redirect the user. We can do this by updating the form data
        if (report && parseInt(report.regionId, DECIMAL_BASE) === -1) {
          updateFormData({ regionId: report.regionId });
        }
      } finally {
        updateLoading(false);
      }
    };
    fetch();
  }, [activityReportId, user, showLastUpdatedTime, region]);

  if (loading) {
    return (
      <div>
        loading...
      </div>
    );
  }

  // If no region was able to be found, we will re-reoute user to the main page
  // FIXME: when re-routing user show a message explaining what happened
  if (formData && parseInt(formData.regionId, DECIMAL_BASE) === -1) {
    return <Redirect to="/" />;
  }

  if (error) {
    return (
      <Alert type="error">
        {error}
      </Alert>
    );
  }

  if (!editable && currentPage !== 'review') {
    return (
      <Redirect push to={`/activity-reports/${activityReportId}/review`} />
    );
  }

  if (!currentPage) {
    return (
      <Redirect push to={`/activity-reports/${activityReportId}/activity-summary`} />
    );
  }

  const updatePage = (position) => {
    if (!editable) {
      return;
    }
    const state = {};
    if (activityReportId === 'new' && reportId.current !== 'new') {
      state.showLastUpdatedTime = true;
    }

    const page = pages.find((p) => p.position === position);
    history.push(`/activity-reports/${reportId.current}/${page.path}`, state);
  };

  const onSave = async (data) => {
    const approverIds = data.approvers.map((a) => a.User.id);
    if (reportId.current === 'new') {
      const savedReport = await createReport(
        { ...data, regionId: formData.regionId, approverUserIds: approverIds }, {},
      );
      reportId.current = savedReport.id;
      window.history.replaceState(null, null, `/activity-reports/${savedReport.id}/${currentPage}`);
    } else {
      // if it isn't a new report, we compare it to the last response from the backend (formData)
      // and pass only the updated to save report
      const updatedFields = findWhatsChanged(data, formData);
      await saveReport(reportId.current, { ...updatedFields, approverUserIds: approverIds }, {});
    }
  };

  const onFormSubmit = async (data) => {
    const approverIds = data.approvers.map((a) => a.User.id);
    const reportToSubmit = { additionalNotes: data.additionalNotes, approverUserIds: approverIds };
    const response = await submitReport(reportId.current, reportToSubmit);

    updateFormData(
      {
        ...formData,
        calculatedStatus: response.calculatedStatus,
        approvers: response.approvers,
      },
    );
    updateEditable(false);
  };

  const onReview = async (data) => {
    await reviewReport(reportId.current, { note: data.note, status: data.status });
  };

  const onResetToDraft = async () => {
    const fetchedReport = await resetToDraft(reportId.current);
    const report = convertReportToFormData(fetchedReport);
    updateFormData(report);
    updateEditable(true);
  };

  const reportCreator = { name: user.name, role: user.role };
  const tagClass = formData.calculatedStatus === REPORT_STATUSES.APPROVED ? 'smart-hub--tag-approved' : '';

  const author = formData.author ? (
    <>
      <hr />
      <p>
        <strong>Creator:</strong>
        {' '}
        {formData.author.fullName}
      </p>

    </>
  ) : null;

  return (
    <div className="smart-hub-activity-report">
      <Helmet titleTemplate="%s - Activity Report - TTA Hub" defaultTitle="TTA Hub - Activity Report" />
      <Grid row className="flex-justify">
        <Grid col="auto">
          <div className="margin-top-3 margin-bottom-5">
            <h1 className="font-serif-2xl text-bold line-height-serif-2 margin-0">
              Activity report for Region
              {' '}
              {formData.regionId}
            </h1>
            {author}
          </div>
        </Grid>
        <Grid col="auto" className="flex-align-self-center">
          {formData.calculatedStatus && (
            <div className={`${tagClass} smart-hub-status-label bg-gray-5 padding-x-2 padding-y-105 font-sans-md text-bold`}>{startCase(formData.calculatedStatus)}</div>
          )}
        </Grid>
      </Grid>
      <Navigator
        key={currentPage}
        editable={editable}
        updatePage={updatePage}
        reportCreator={reportCreator}
        showValidationErrors={showValidationErrors}
        updateShowValidationErrors={updateShowValidationErrors}
        lastSaveTime={lastSaveTime}
        updateLastSaveTime={updateLastSaveTime}
        reportId={reportId.current}
        currentPage={currentPage}
        additionalData={initialAdditionalData}
        formData={formData}
        updateFormData={updateFormData}
        pages={pages}
        onFormSubmit={onFormSubmit}
        onSave={onSave}
        onResetToDraft={onResetToDraft}
        isApprover={isApprover}
        isPendingApprover={isPendingApprover} // is an approver and is pending their approval.
        onReview={onReview}
        errorMessage={errorMessage}
        updateErrorMessage={updateErrorMessage}
      />
    </div>
  );
}

ActivityReport.propTypes = {
  match: ReactRouterPropTypes.match.isRequired,
  location: ReactRouterPropTypes.location.isRequired,
  region: PropTypes.number,
  user: PropTypes.shape({
    id: PropTypes.number,
    name: PropTypes.string,
    role: PropTypes.arrayOf(PropTypes.string),
  }).isRequired,
};

ActivityReport.defaultProps = {
  region: undefined,
};

export default ActivityReport;
