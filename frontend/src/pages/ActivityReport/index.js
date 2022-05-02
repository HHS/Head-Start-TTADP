/*
  Activity report. Makes use of the navigator to split the long form into
  multiple pages. Each "page" is defined in the `./Pages` directory.
*/
import React, {
  useState, useEffect, useRef, useContext,
} from 'react';
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
import UserContext from '../../UserContext';

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
    if (current === 'startDate' || current === 'endDate') {
      if (!object[current] || !moment(object[current], 'MM/DD/YYYY').isValid()) {
        accumulator[current] = null;
        return accumulator;
      }
    }

    if (current === 'creatorRole' && !object[current]) {
      accumulator[current] = null;
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

/**
 * Goals created are editable until the report is loaded again. The report used to
 * not update freshly created goals with their DB id once saved, but this caused
 * any additional updates to create a brand new goal instead of updating the old goal.
 * We now use the goal created in the DB. However this means we no longer know if the
 * goal should be editable or not, since it was loaded from the DB. This method takes
 * the list of newly created goals and grabs their names, placed in the `editableGoals`
 * variable. Then all goals returned form the API (the report object passed into this
 * method) have their name compared against the list of fresh goals. The UI then uses
 * the `new` property to determine if a goal should be editable or not.
 * @param {*} report the freshly updated report
 * @returns {function} function that can be used by `setState` to update
 * formData
 */
export const updateGoals = (report) => (oldFormData) => {
  const oldGoals = oldFormData.goals || [];
  const newGoals = report.goals || [];

  const goalsThatUsedToBeNew = oldGoals.filter((goal) => goal.new);
  const goalsFreshlySavedInDB = goalsThatUsedToBeNew.map((goal) => goal.name);
  const goals = newGoals.map((goal) => {
    const goalEditable = goalsFreshlySavedInDB.includes(goal.name);
    return {
      ...goal,
      new: goalEditable,
    };
  });
  return { ...oldFormData, goals, objectivesWithoutGoals: report.objectivesWithoutGoals };
};

function ActivityReport({
  match, location, region,
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
  const [creatorNameWithRole, updateCreatorRoleWithName] = useState('');
  const reportId = useRef();
  const { user } = useContext(UserContext);

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

  const userHasOneRole = user && user.role && user.role.length === 1;

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
            creatorRole: userHasOneRole ? user.role[0] : null,
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

        const isMatchingApprover = report.approvers.filter((a) => a.User && a.User.id === user.id);

        const canWriteAsCollaboratorOrAuthor = (isCollaborator || isAuthor)
        && (report.calculatedStatus === REPORT_STATUSES.DRAFT
          || report.calculatedStatus === REPORT_STATUSES.NEEDS_ACTION);

        const canWriteAsApprover = (isMatchingApprover && isMatchingApprover.length > 0 && (
          report.calculatedStatus === REPORT_STATUSES.SUBMITTED)
        );

        updateAdditionalData({ recipients, collaborators, availableApprovers });
        updateCreatorRoleWithName(report.creatorNameWithRole);
        updateFormData(report);

        // ***Determine if the current user matches any of the approvers for this activity report.
        // If author or collab and the report is in EDIT state we are NOT currently an approver.

        if (isMatchingApprover && isMatchingApprover.length > 0) {
          // This user is an approver on the report.
          updateIsApprover(true);

          // This user is a approver on the report and has a pending approval.
          if (isMatchingApprover[0].status === null || isMatchingApprover[0].status === 'pending') {
            updateIsPendingApprover(true);
          }
        }

        // if a report has been marked as need action or approved by any approver, it can no longer
        // be edited even by an approver
        const approverHasMarkedReport = report.approvers.some((approver) => (
          approver.status === REPORT_STATUSES.APPROVED
        ));

        const canWriteReport = canWriteAsCollaboratorOrAuthor
          || (
            canWriteAsApprover
             && !approverHasMarkedReport
          );

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

  if (!currentPage && editable && isPendingApprover) {
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
      const { startDate, endDate, ...fields } = data;
      let startDateToSave = startDate;
      if (startDateToSave === 'Invalid date' || startDateToSave === '' || !moment(startDateToSave, 'MM/DD/YYYY').isValid()) {
        startDateToSave = null;
      }

      let endDateToSave = endDate;
      if (endDateToSave === 'Invalid date' || endDateToSave === '' || !moment(endDateToSave, 'MM/DD/YYYY').isValid()) {
        endDateToSave = null;
      }
      const savedReport = await createReport(
        {
          ...fields,
          startDate: startDateToSave,
          endDate: endDateToSave,
          regionId: formData.regionId,
          approverUserIds: approverIds,
        },
      );

      /*
        Since the new state of formData depends on the previous state we need to update
        inside a function. See https://reactjs.org/docs/hooks-reference.html#functional-updates
      */
      updateFormData(updateGoals(savedReport));
      reportId.current = savedReport.id;
      window.history.replaceState(null, null, `/activity-reports/${savedReport.id}/${currentPage}`);
    } else {
      // if it isn't a new report, we compare it to the last response from the backend (formData)
      // and pass only the updated to save report
      const creatorRole = !data.creatorRole && userHasOneRole ? user.role[0] : data.creatorRole;
      const updatedFields = findWhatsChanged({ ...data, creatorRole }, formData);
      const updatedReport = await saveReport(
        reportId.current, { ...updatedFields, approverUserIds: approverIds },
        {},
      );
      updateFormData(updateGoals(updatedReport));
      updateCreatorRoleWithName(updatedReport.creatorNameWithRole);
    }
  };

  const onFormSubmit = async (data) => {
    const approverIds = data.approvers.map((a) => a.User.id);
    const reportToSubmit = {
      additionalNotes: data.additionalNotes,
      approverUserIds: approverIds,
      creatorRole: data.creatorRole,
    };
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

  const author = creatorNameWithRole ? (
    <>
      <hr />
      <p>
        <strong>Creator:</strong>
        {' '}
        {creatorNameWithRole}
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
