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

import './index.scss';
import { NOT_STARTED } from '../../components/Navigator/constants';
import {
  REPORT_STATUSES,
  DECIMAL_BASE,
  LOCAL_STORAGE_DATA_KEY,
  LOCAL_STORAGE_ADDITIONAL_DATA_KEY,
  LOCAL_STORAGE_EDITABLE_KEY,
  DATE_DISPLAY_FORMAT,
  DATEPICKER_VALUE_FORMAT,
} from '../../Constants';
import { getRegionWithReadWrite } from '../../permissions';
import useARLocalStorage from '../../hooks/useARLocalStorage';

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
import useLocalStorage from '../../hooks/useLocalStorage';
import NetworkContext, { isOnlineMode } from '../../NetworkContext';
import { HTTPError } from '../../fetchers';
import UserContext from '../../UserContext';

const defaultValues = {
  ECLKCResourcesUsed: [],
  activityRecipientType: '',
  activityRecipients: [],
  activityType: [],
  additionalNotes: null,
  files: [],
  collaborators: [],
  activityReportCollaborators: [],
  context: '',
  deliveryMethod: null,
  duration: '',
  endDate: null,
  goals: [],
  recipientNextSteps: [{ id: null, note: '' }],
  recipients: [],
  nonECLKCResourcesUsed: [],
  numberOfParticipants: null,
  objectivesWithoutGoals: [],
  otherResources: [],
  participantCategory: '',
  participants: [],
  reason: [],
  requester: '',
  specialistNextSteps: [{ id: null, note: '' }],
  startDate: null,
  calculatedStatus: REPORT_STATUSES.DRAFT,
  targetPopulations: [],
  topics: [],
  approvers: [],
};

const pagesByPos = keyBy(pages.filter((p) => !p.review), (page) => page.position);
const defaultPageState = mapValues(pagesByPos, () => NOT_STARTED);

export function cleanupLocalStorage(id, replacementKey) {
  try {
    if (replacementKey) {
      window.localStorage.setItem(
        LOCAL_STORAGE_DATA_KEY(replacementKey),
        window.localStorage.getItem(LOCAL_STORAGE_DATA_KEY(id)),
      );
      window.localStorage.setItem(
        LOCAL_STORAGE_EDITABLE_KEY(replacementKey),
        window.localStorage.getItem(LOCAL_STORAGE_EDITABLE_KEY(id)),
      );
      window.localStorage.setItem(
        LOCAL_STORAGE_ADDITIONAL_DATA_KEY(replacementKey),
        window.localStorage.getItem(LOCAL_STORAGE_ADDITIONAL_DATA_KEY(id)),
      );
    }

    window.localStorage.removeItem(LOCAL_STORAGE_DATA_KEY(id));
    window.localStorage.removeItem(LOCAL_STORAGE_ADDITIONAL_DATA_KEY(id));
    window.localStorage.removeItem(LOCAL_STORAGE_EDITABLE_KEY(id));
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('Local storage may not be available: ', e);
  }
}

function setConnectionActiveWithError(e, setConnectionActive) {
  let connection = false;
  // if we get an "unauthorized" or "not found" responce back from the API, we DON'T
  // display the "network is unavailable" message
  if (e instanceof HTTPError && [403, 404].includes(e.status)) {
    connection = true;
  }
  setConnectionActive(connection);
  return connection;
}

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

    // this block intends to fix an issue where multi recipients are removed from a report
    // after goals have been saved we pass up the removed recipients so that their specific links
    // to the activity report/goals will be severed on the backend
    if (current === 'activityRecipients' && !isEqual(base[current], object[current])) {
      // eslint-disable-next-line max-len
      const grantIds = object.activityRecipients.map((activityRecipient) => activityRecipient.activityRecipientId);
      // eslint-disable-next-line max-len
      accumulator.recipientsWhoHaveGoalsThatShouldBeRemoved = base.activityRecipients.filter((baseData) => (
        !grantIds.includes(baseData.activityRecipientId)
      )).map((activityRecipient) => activityRecipient.activityRecipientId);

      // if we change activity recipients we should always ship the goals up as well
      // we do hit recipients first, so if they were somehow both changed before the API was hit
      // (unlikely since they are on different parts of the form)
      // the goals that were changed would overwrite the next line
      accumulator.goals = base.goals.map((goal) => ({ ...goal, grantIds }));
    }

    if (!isEqual(base[current], object[current])) {
      accumulator[current] = object[current];
    }

    return accumulator;
  }

  // we sort these so they traverse in a particular order
  // (ActivityRecipients before goals, in particular)
  return Object.keys(object).sort().reduce(reduction, {});
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

  const [lastSaveTime, updateLastSaveTime] = useState(null);

  const [formData, updateFormData, localStorageAvailable] = useARLocalStorage(
    LOCAL_STORAGE_DATA_KEY(activityReportId), null,
  );

  // retrieve the last time the data was saved to local storage
  const savedToStorageTime = formData ? formData.savedToStorageTime : null;

  const [initialAdditionalData, updateAdditionalData] = useLocalStorage(
    LOCAL_STORAGE_ADDITIONAL_DATA_KEY(activityReportId), {
      recipients: {
        grants: [],
        otherEntities: [],
      },
      collaborators: [],
      availableApprovers: [],
    },
  );
  const [isApprover, updateIsApprover] = useState(false);
  // If the user is one of the approvers on this report and is still pending approval.
  const [isPendingApprover, updateIsPendingApprover] = useState(false);
  const [editable, updateEditable] = useLocalStorage(
    LOCAL_STORAGE_EDITABLE_KEY(activityReportId), (activityReportId === 'new'), currentPage !== 'review',
  );
  const [errorMessage, updateErrorMessage] = useState();
  // this attempts to track whether or not we're online
  // (or at least, if the backend is responding)
  const [connectionActive, setConnectionActive] = useState(true);

  const [creatorNameWithRole, updateCreatorRoleWithName] = useState('');
  const reportId = useRef();
  const { user } = useContext(UserContext);

  const showLastUpdatedTime = (
    location.state && location.state.showLastUpdatedTime && connectionActive
  ) || false;

  useEffect(() => {
    // Clear history state once mounted and activityReportId changes. This prevents someone from
    // seeing a save message if they refresh the page after creating a new report.
    history.replace();
  }, [activityReportId, history]);

  const convertGoalsToFormData = (goals, grantIds) => goals.map((goal) => ({ ...goal, grantIds }));

  const convertObjectivesWithoutGoalsToFormData = (
    objectives, recipientIds,
  ) => objectives.map((objective) => ({
    ...objective,
    recipientIds,
  }));

  const convertReportToFormData = (fetchedReport) => {
    let grantIds = [];
    let otherEntities = [];
    if (fetchedReport.activityRecipientType === 'recipient' && fetchedReport.activityRecipients) {
      grantIds = fetchedReport.activityRecipients.map(({ id }) => id);
    } else {
      otherEntities = fetchedReport.activityRecipients.map(({ id }) => id);
    }

    const activityRecipients = fetchedReport.activityRecipients.map((ar) => ({
      activityRecipientId: ar.id,
      name: ar.name,
    }));

    const goals = convertGoalsToFormData(fetchedReport.goalsAndObjectives, grantIds);
    const objectivesWithoutGoals = convertObjectivesWithoutGoalsToFormData(
      fetchedReport.objectivesWithoutGoals, otherEntities,
    );
    const ECLKCResourcesUsed = unflattenResourcesUsed(fetchedReport.ECLKCResourcesUsed);
    const nonECLKCResourcesUsed = unflattenResourcesUsed(fetchedReport.nonECLKCResourcesUsed);
    const endDate = fetchedReport.endDate ? moment(fetchedReport.endDate, DATEPICKER_VALUE_FORMAT).format(DATE_DISPLAY_FORMAT) : '';
    const startDate = fetchedReport.startDate ? moment(fetchedReport.startDate, DATEPICKER_VALUE_FORMAT).format(DATE_DISPLAY_FORMAT) : '';
    return {
      ...fetchedReport,
      activityRecipients,
      ECLKCResourcesUsed,
      nonECLKCResourcesUsed,
      goals,
      endDate,
      startDate,
      objectivesWithoutGoals,
    };
  };

  // cleanup local storage if the report has been submitted or approved
  useEffect(() => {
    if (formData
      && (formData.calculatedStatus === REPORT_STATUSES.APPROVED
      || formData.calculatedStatus === REPORT_STATUSES.SUBMITTED)
    ) {
      cleanupLocalStorage(activityReportId);
    }
  }, [activityReportId, formData]);

  const userHasOneRole = user && user.roles && user.roles.length === 1;

  useDeepCompareEffect(() => {
    const fetch = async () => {
      let report;

      try {
        updateLoading(true);
        reportId.current = activityReportId;

        if (activityReportId !== 'new') {
          const fetchedReport = await getReport(activityReportId);
          report = convertReportToFormData(fetchedReport);
        } else {
          report = {
            ...defaultValues,
            creatorRole: userHasOneRole ? user.roles[0].fullName : null,
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

        const isCollaborator = report.activityReportCollaborators
          && report.activityReportCollaborators.find((u) => u.userId === user.id);

        const isAuthor = report.userId === user.id;

        // The report can be edited if its in draft OR needs_action state.

        const isMatchingApprover = report.approvers.filter((a) => a.User && a.User.id === user.id);

        const canWriteAsCollaboratorOrAuthor = (isCollaborator || isAuthor)
        && (report.calculatedStatus === REPORT_STATUSES.DRAFT
          || report.calculatedStatus === REPORT_STATUSES.NEEDS_ACTION);

        const canWriteAsApprover = (isMatchingApprover && isMatchingApprover.length > 0 && (
          report.calculatedStatus === REPORT_STATUSES.SUBMITTED)
        );

        updateAdditionalData({
          recipients: recipients || {
            grants: [],
            otherEntities: [],
          },
          collaborators: collaborators || [],
          availableApprovers: availableApprovers || [],
        });

        let shouldUpdateFromNetwork = true;

        // this if statement compares the "saved to storage time" and the
        // time retrieved from the network (report.updatedAt)
        // and whichever is newer "wins"

        if (formData && savedToStorageTime) {
          const updatedAtFromNetwork = moment(report.updatedAt);
          const updatedAtFromLocalStorage = moment(savedToStorageTime);
          if (updatedAtFromNetwork.isValid() && updatedAtFromLocalStorage.isValid()) {
            const storageIsNewer = updatedAtFromLocalStorage.isAfter(updatedAtFromNetwork);
            if (storageIsNewer && formData.calculatedStatus === REPORT_STATUSES.DRAFT) {
              shouldUpdateFromNetwork = false;
            }
          }
        }

        //
        if (shouldUpdateFromNetwork && activityReportId !== 'new') {
          updateFormData({ ...formData, ...report }, true);
        } else {
          updateFormData({ ...report, ...formData }, true);
        }

        updateCreatorRoleWithName(report.creatorNameWithRole);

        // Determine if the current user matches any of the approvers for this activity report.
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
        const connection = setConnectionActiveWithError(e, setConnectionActive);
        const networkErrorMessage = (
          <>
            {/* eslint-disable-next-line max-len */}
            There&rsquo;s an issue with your connection. Some sections of this form may not load correctly.
            <br />
            Your work is saved on this computer. If you continue to have problems,
            {' '}
            <a href="https://app.smartsheetgov.com/b/form/f0b4725683f04f349a939bd2e3f5425a">contact us</a>
            .
          </>
        );
        const errorMsg = !connection ? networkErrorMessage : <>Unable to load activity report</>;
        updateError(errorMsg);
        // If the error was caused by an invalid region, we need a way to communicate that to the
        // component so we can redirect the user. We can do this by updating the form data
        if (report && parseInt(report.regionId, DECIMAL_BASE) === -1) {
          updateFormData({ regionId: report.regionId }, true);
        }

        if (formData === null && !connection) {
          updateFormData({ ...defaultValues, pageState: defaultPageState }, true);
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

  // If no region was able to be found, we will re-reroute user to the main page
  // FIXME: when re-routing user show a message explaining what happened
  if (formData && parseInt(formData.regionId, DECIMAL_BASE) === -1) {
    return <Redirect to="/" />;
  }

  // This error message is a catch all assuming that the network storage is working
  if (error && !formData) {
    return (
      <Alert type="error">
        {error}
      </Alert>
    );
  }

  if (connectionActive && !editable && currentPage !== 'review') {
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
    try {
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
            ECLKCResourcesUsed: data.ECLKCResourcesUsed.map((r) => (r.value)),
            nonECLKCResourcesUsed: data.nonECLKCResourcesUsed.map((r) => (r.value)),
            startDate: startDateToSave,
            endDate: endDateToSave,
            regionId: formData.regionId,
            approverUserIds: approverIds,
          },
        );

        if (!savedReport) {
          throw new Error('Report not found');
        }

        reportId.current = savedReport.id;

        cleanupLocalStorage('new', savedReport.id);

        window.history.replaceState(null, null, `/activity-reports/${savedReport.id}/${currentPage}`);

        setConnectionActive(true);
        updateCreatorRoleWithName(savedReport.creatorNameWithRole);
      } else {
        // if it isn't a new report, we compare it to the last response from the backend (formData)
        // and pass only the updated to save report
        const creatorRole = !data.creatorRole && userHasOneRole
          ? user.roles[0].fullName
          : data.creatorRole;
        const updatedFields = findWhatsChanged({ ...data, creatorRole }, formData);
        const updatedReport = await saveReport(
          reportId.current, { ...updatedFields, approverUserIds: approverIds }, {},
        );

        setConnectionActive(true);
        updateCreatorRoleWithName(updatedReport.creatorNameWithRole);
      }
    } catch (e) {
      setConnectionActiveWithError(error, setConnectionActive);
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
      true,
    );
    updateEditable(false);

    cleanupLocalStorage(activityReportId);
  };

  const onReview = async (data) => {
    await reviewReport(reportId.current, { note: data.note, status: data.status });
  };

  const onResetToDraft = async () => {
    const fetchedReport = await resetToDraft(reportId.current);
    const report = convertReportToFormData(fetchedReport);
    updateFormData(report, true);
    updateEditable(true);
  };

  const reportCreator = { name: user.name, roles: user.roles };
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
      { error
      && (
      <Alert type="warning">
        {error}
      </Alert>
      )}
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
      <NetworkContext.Provider value={
        {
          connectionActive: isOnlineMode && connectionActive,
          localStorageAvailable,
        }
      }
      >
        <Navigator
          key={currentPage}
          editable={editable}
          updatePage={updatePage}
          reportCreator={reportCreator}
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
          savedToStorageTime={savedToStorageTime}
        />
      </NetworkContext.Provider>
    </div>
  );
}

ActivityReport.propTypes = {
  match: ReactRouterPropTypes.match.isRequired,
  location: ReactRouterPropTypes.location.isRequired,
  region: PropTypes.number,
};

ActivityReport.defaultProps = {
  region: undefined,
};

export default ActivityReport;
