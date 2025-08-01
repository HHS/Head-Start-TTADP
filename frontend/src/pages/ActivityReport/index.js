/*
  Activity report. Makes use of the navigator to split the long form into
  multiple pages. Each "page" is defined in the `./Pages` directory.
*/
import React, {
  useState, useEffect, useRef, useContext, useMemo,
} from 'react';
import PropTypes from 'prop-types';
import {
  keyBy, mapValues, startCase,
} from 'lodash';
import { Helmet } from 'react-helmet';
import ReactRouterPropTypes from 'react-router-prop-types';
import { useHistory, Redirect } from 'react-router-dom';
import { Alert, Grid } from '@trussworks/react-uswds';
import useDeepCompareEffect from 'use-deep-compare-effect';
import moment from 'moment';
import { REPORT_STATUSES, DECIMAL_BASE } from '@ttahub/common';
import pages from './Pages';
import ActivityReportNavigator from '../../components/Navigator/ActivityReportNavigator';
import './index.scss';
import { NOT_STARTED } from '../../components/Navigator/constants';
import {
  LOCAL_STORAGE_DATA_KEY,
  LOCAL_STORAGE_ADDITIONAL_DATA_KEY,
  LOCAL_STORAGE_EDITABLE_KEY,
} from '../../Constants';
import { getRegionWithReadWrite } from '../../permissions';
import useARLocalStorage from '../../hooks/useARLocalStorage';
import { convertGoalsToFormData, convertReportToFormData, findWhatsChanged } from './formDataHelpers';
import {
  submitReport,
  saveReport,
  getReport,
  getRecipientsForExistingAR,
  createReport,
  getCollaborators,
  getApprovers,
  reviewReport,
  resetToDraft,
  getGroupsForActivityReport,
  getRecipients,
} from '../../fetchers/activityReports';
import useLocalStorage, { setConnectionActiveWithError } from '../../hooks/useLocalStorage';
import NetworkContext, { isOnlineMode } from '../../NetworkContext';
import UserContext from '../../UserContext';
import MeshPresenceManager from '../../components/MeshPresenceManager';

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
  recipientGroup: null,
  language: [],
};

const pagesByPos = keyBy(pages.filter((p) => !p.review), (page) => page.position);
const defaultPageState = mapValues(pagesByPos, () => NOT_STARTED);

export const formatReportWithSaveBeforeConversion = async (
  data,
  formData,
  user,
  userHasOneRole,
  reportId,
  approverIds,
  forceUpdate,
) => {
  // if it isn't a new report, we compare it to the last response from the backend (formData)
  // and pass only the updated to save report
  const creatorRole = !data.creatorRole && userHasOneRole
    ? user.roles[0].fullName
    : data.creatorRole;

  const updatedFields = findWhatsChanged({ ...data, creatorRole }, formData);
  const isEmpty = Object.keys(updatedFields).length === 0;

  // save report returns dates in YYYY-MM-DD format, so we need to parse them
  // formData stores them as MM/DD/YYYY so we are good in that instance
  const thereIsANeedToParseDates = !isEmpty;

  const updatedReport = isEmpty && !forceUpdate
    ? { ...formData }
    : await saveReport(
      reportId.current, {
        ...updatedFields,
        version: 2,
        approverUserIds: approverIds,
        pageState: data.pageState,
      }, {},
    );

  let reportData = {
    ...updatedReport,
  };

  if (thereIsANeedToParseDates) {
    reportData = {
      ...reportData,
      startDate: moment(updatedReport.startDate, 'YYYY-MM-DD').format('MM/DD/YYYY'),
      endDate: moment(updatedReport.endDate, 'YYYY-MM-DD').format('MM/DD/YYYY'),
    };
  }

  return reportData;
};

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

function ActivityReport({
  match, location, region,
}) {
  const { params: { currentPage, activityReportId } } = match;

  const history = useHistory();
  const [error, updateError] = useState();
  const [loading, updateLoading] = useState(true);

  const [lastSaveTime, updateLastSaveTime] = useState(null);

  const [presenceData, setPresenceData] = useState({
    hasMultipleUsers: false,
    otherUsers: [],
    tabCount: 0,
  });
  const [shouldAutoSave, setShouldAutoSave] = useState(true);

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
      groups: [],
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

  // If there are multiple users working on the same report, we need to suspend auto-saving
  useEffect(() => {
    if (presenceData.hasMultipleUsers || presenceData.tabCount > 1) {
      const otherUsernames = presenceData.otherUsers
        .map((presenceUser) => (presenceUser.username ? presenceUser.username : 'Unknown user'))
        .filter((username, index, self) => self.indexOf(username) === index);
      if (otherUsernames.length > 0 || presenceData.tabCount > 1) {
        setShouldAutoSave(false);
      } else {
        setShouldAutoSave(true);
      }
    } else {
      setShouldAutoSave(true);
    }
  }, [presenceData]);

  // cleanup local storage if the report has been submitted or approved
  useEffect(() => {
    if (formData
      && (formData.calculatedStatus === REPORT_STATUSES.APPROVED
      || formData.calculatedStatus === REPORT_STATUSES.SUBMITTED)
    ) {
      cleanupLocalStorage(activityReportId);
    }
  }, [activityReportId, formData]);

  const userHasOneRole = useMemo(() => user && user.roles && user.roles.length === 1, [user]);

  useDeepCompareEffect(() => {
    const fetch = async () => {
      let report;

      try {
        updateLoading(true);
        reportId.current = activityReportId;

        if (activityReportId !== 'new') {
          let fetchedReport;
          try {
            fetchedReport = await getReport(activityReportId);
          } catch (e) {
            // If error retrieving the report show the "something went wrong" page.
            history.push('/something-went-wrong/500');
          }
          report = convertReportToFormData(fetchedReport);
        } else {
          report = {
            ...defaultValues,
            creatorRole: userHasOneRole ? user.roles[0].fullName : null,
            pageState: defaultPageState,
            userId: user.id,
            regionId: region || getRegionWithReadWrite(user),
            version: 2,
          };
        }

        const getRecips = async () => {
          if (reportId.current && reportId.current !== 'new') {
            return getRecipientsForExistingAR(reportId.current);
          }

          return getRecipients(report.regionId);
        };

        const apiCalls = [
          getRecips(),
          getCollaborators(report.regionId),
          getApprovers(report.regionId),
          getGroupsForActivityReport(report.regionId),
        ];

        const [recipients, collaborators, availableApprovers, groups] = await Promise.all(apiCalls);
        const isCollaborator = report.activityReportCollaborators
          && report.activityReportCollaborators.find((u) => u.userId === user.id);

        const isAuthor = report.userId === user.id;

        // The report can be edited if its in draft OR needs_action state.

        const isMatchingApprover = report.approvers.filter((a) => a.user && a.user.id === user.id);

        const canWriteAsCollaboratorOrAuthor = (isCollaborator || isAuthor)
        && (report.calculatedStatus === REPORT_STATUSES.DRAFT
          || report.calculatedStatus === REPORT_STATUSES.NEEDS_ACTION);

        const canWriteAsApprover = (isMatchingApprover && isMatchingApprover.length > 0 && (
          report.calculatedStatus === REPORT_STATUSES.SUBMITTED)
        );

        // Add recipientIds to groups.
        const groupsWithRecipientIds = groups.map((group) => ({
          ...group,
          // Match groups to grants as recipients could have multiple grants.
          recipients: group.grants.map((g) => g.id),
        }));

        updateAdditionalData({
          recipients: recipients || {
            grants: [],
            otherEntities: [],
          },
          collaborators: collaborators || [],
          availableApprovers: availableApprovers || [],
          groups: groupsWithRecipientIds || [],
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

        // Update form data.
        if (shouldUpdateFromNetwork && activityReportId !== 'new') {
          updateFormData({ ...formData, goalForEditing: null, ...report }, true);
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
      <Redirect to={`/activity-reports/${activityReportId}/review`} />
    );
  }

  if (!currentPage && editable && isPendingApprover) {
    return (
      <Redirect to={`/activity-reports/${activityReportId}/review`} />
    );
  }

  if (!currentPage) {
    return (
      <Redirect to={`/activity-reports/${activityReportId}/activity-summary`} />
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
    const newPath = `/activity-reports/${reportId.current}/${page.path}`;
    history.push(newPath, state);
  };

  const onSave = async (data, forceUpdate = false) => {
    const approverIds = data.approvers.map((a) => a.user.id);
    try {
      if (reportId.current === 'new') {
        const savedReport = await createReport(
          {
            ...data,
            ECLKCResourcesUsed: data.ECLKCResourcesUsed.map((r) => (r.value)),
            nonECLKCResourcesUsed: data.nonECLKCResourcesUsed.map((r) => (r.value)),
            regionId: formData.regionId,
            approverUserIds: approverIds,
            version: 2,
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
        const updatedReport = await formatReportWithSaveBeforeConversion(
          data,
          formData,
          user,
          userHasOneRole,
          reportId,
          approverIds,
          forceUpdate,
        );

        let reportData = updatedReport;

        // if we are dealing with a recipient report, we need to do a little magic to
        // format the goals and objectives appropriately, as well as divide them
        // by which one is open and which one is not
        if (updatedReport.activityRecipientType === 'recipient') {
          const { goalForEditing, goals } = convertGoalsToFormData(
            updatedReport.goalsAndObjectives,
            updatedReport.activityRecipients.map((r) => r.activityRecipientId),
          );

          reportData = {
            ...updatedReport,
            goalForEditing,
            goals,
          };
        }
        updateFormData(reportData, true);
        setConnectionActive(true);
        updateCreatorRoleWithName(updatedReport.creatorNameWithRole);
      }
    } catch (e) {
      setConnectionActiveWithError(error, setConnectionActive);
    }
  };

  const onFormSubmit = async (data) => {
    const approverIds = data.approvers.map((a) => a.user.id);
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

  /* istanbul ignore next: hard to test websocket functionality */
  // receives presence updates from the Mesh component
  const handlePresenceUpdate = (data) => {
    setPresenceData(data);
  };

  /* istanbul ignore next: hard to test websocket functionality */
  // eslint-disable-next-line no-shadow, no-unused-vars
  const handleRevisionUpdate = (revision, { userId, timestamp, reportId }) => {
    // If the user is not the one who made the revision, redirect them to the revision change page.
    if (user.id !== userId) {
      history.push('/activity-reports/revision-change');
    }
  };

  /* istanbul ignore next: hard to test websocket functionality */
  const renderMultiUserAlert = () => {
    if (presenceData.hasMultipleUsers) {
      const otherUsernames = presenceData.otherUsers
        .map((presenceUser) => (presenceUser.username ? presenceUser.username : 'Unknown user'))
        .filter((username, index, self) => self.indexOf(username) === index);

      let usersText = 'There are other users currently working on this report.';

      if (otherUsernames.length > 0) {
        if (otherUsernames.length === 1) {
          usersText = `${otherUsernames[0]} is also working on this report. Your changes may not be saved. Check with them before working on this report.`;
        } else if (otherUsernames.length === 2) {
          usersText = `${otherUsernames[0]} and ${otherUsernames[1]} are also working on this report. Your changes may not be saved. Check with them before working on this report.`;
        } else {
          const lastUser = otherUsernames.pop();
          usersText = `${otherUsernames.join(', ')}, and ${lastUser} are also working on this report. Your changes may not be saved. Check with them before working on this report.`;
        }
      }

      return (
        <Alert type="warning">
          {usersText}
        </Alert>
      );
    }
    return null;
  };

  /* istanbul ignore next: hard to test websocket functionality */
  const renderMultipleTabAlert = () => {
    if (presenceData.tabCount > 1) {
      return (
        <Alert type="warning">
          You have this report open in multiple browser tabs.
          {' '}
          To prevent losing your work, please close the other tabs before continuing.
        </Alert>
      );
    }
    return null;
  };

  return (
    <div className="smart-hub-activity-report">
      { error
      && (
      <Alert type="warning">
        {error}
      </Alert>
      )}
      {renderMultiUserAlert() || renderMultipleTabAlert()}
      {/* Don't render the Mesh component unless working on a saved report */}
      { activityReportId !== 'new' && (<MeshPresenceManager room={`ar-${activityReportId}`} onPresenceUpdate={handlePresenceUpdate} onRevisionUpdate={handleRevisionUpdate} />)}
      <Helmet titleTemplate="%s - Activity Report | TTA Hub" defaultTitle="Activity Report | TTA Hub" />
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
          connectionActive: isOnlineMode() && connectionActive,
          localStorageAvailable,
        }
      }
      >
        <ActivityReportNavigator
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
          shouldAutoSave={shouldAutoSave}
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
