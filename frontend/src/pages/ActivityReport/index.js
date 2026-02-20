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
import { parse, format } from 'date-fns';
import { REPORT_STATUSES } from '@ttahub/common';
import { useForm } from 'react-hook-form';
import pages from './Pages';
import ActivityReportNavigator from '../../components/Navigator/ActivityReportNavigator';
import './index.scss';
import { NOT_STARTED } from '../../components/Navigator/constants';
import {
  LOCAL_STORAGE_AR_ADDITIONAL_DATA_KEY,
  LOCAL_STORAGE_AR_DATA_KEY,
  LOCAL_STORAGE_AR_EDITABLE_KEY,
} from '../../Constants';
import { getRegionWithReadWrite } from '../../permissions';
import {
  convertGoalsToFormData,
  convertReportToFormData,
  findWhatsChanged,
  packageGoals,
  extractGoalIdsInOrder,
} from './formDataHelpers';
import {
  submitReport,
  saveReport,
  getReport,
  getRecipientsForExistingAR,
  createReport,
  getApprovers,
  reviewReport,
  getGroupsForActivityReport,
  getRecipients,
} from '../../fetchers/activityReports';
import { getCollaborators } from '../../fetchers/collaborators';
import useLocalStorage, { setConnectionActiveWithError } from '../../hooks/useLocalStorage';
import NetworkContext, { isOnlineMode } from '../../NetworkContext';
import UserContext from '../../UserContext';
import MeshPresenceManager from '../../components/MeshPresenceManager';
import useLocalStorageCleanup, { cleanupLocalStorage } from '../../hooks/useLocalStorageCleanup';
import usePresenceData from '../../hooks/usePresenceData';
import useHookFormLocalStorage from '../../hooks/useHookFormLocalStorage';

const defaultValues = {
  ECLKCResourcesUsed: [],
  activityRecipientType: 'recipient',
  activityRecipients: [],
  activityType: [],
  additionalNotes: null,
  files: [],
  collaborators: [],
  activityReportCollaborators: [],
  context: '',
  deliveryMethod: null,
  duration: null, // Keep this as null for local storage and form validation.
  revision: 0,
  endDate: null,
  goals: [],
  recipientNextSteps: [{ id: null, note: '' }],
  recipients: [],
  nonECLKCResourcesUsed: [],
  numberOfParticipants: null,
  numberOfParticipantsInPerson: null,
  numberOfParticipantsVirtually: null,
  objectivesWithoutGoals: [],
  otherResources: [],
  participantCategory: '',
  participants: [],
  requester: '',
  specialistNextSteps: [{ id: null, note: '' }],
  startDate: null,
  calculatedStatus: REPORT_STATUSES.DRAFT,
  targetPopulations: [],
  topics: [],
  approvers: [],
  recipientGroup: null,
  language: [],
  activityReason: null,
};

const pagesByPos = keyBy(pages.filter((p) => !p.review), (page) => page.position);
const defaultPageState = mapValues(pagesByPos, () => NOT_STARTED);

export const formatReportWithSaveBeforeConversion = async (
  data,
  lastSavedData,
  user,
  userHasOneRole,
  reportId,
  approverIds,
  forceUpdate,
) => {
  // if it isn't a new report, we compare it to the last response from the backend (lastSavedData)
  // and pass only the updated to save report
  const creatorRole = !data.creatorRole && userHasOneRole
    ? user.roles[0].fullName
    : data.creatorRole;

  const updatedFields = findWhatsChanged({ ...data, creatorRole }, lastSavedData);
  const isEmpty = Object.keys(updatedFields).length === 0;

  // save report returns dates in YYYY-MM-DD format, so we need to parse them
  // lastSavedData stores them as MM/DD/YYYY so we are good in that instance
  const thereIsANeedToParseDates = !isEmpty;
  const updatedReport = isEmpty && !forceUpdate
    ? { ...lastSavedData }
    : await saveReport(
      reportId.current, {
        ...updatedFields,
        version: 3,
        approverUserIds: approverIds,
        pageState: data.pageState,
        activityRecipientType: 'recipient',
      }, {},
    );

  let reportData = {
    ...updatedReport,
  };

  if (thereIsANeedToParseDates) {
    reportData = {
      ...reportData,
      startDate: format(parse(updatedReport.startDate, 'yyyy-MM-dd', new Date()), 'MM/dd/yyyy'),
      endDate: format(parse(updatedReport.endDate, 'yyyy-MM-dd', new Date()), 'MM/dd/yyyy'),
    };
  }

  return reportData;
};

function ActivityReport({
  match, location, region,
}) {
  const { params: { currentPage, activityReportId } } = match;

  const history = useHistory();
  const [error, updateError] = useState();
  const [loading, updateLoading] = useState(true);

  const [lastSaveTime, updateLastSaveTime] = useState(null);
  const [shouldAutoSave, setShouldAutoSave] = useState(true);

  const {
    presenceData,
    handlePresenceUpdate,
  } = usePresenceData(setShouldAutoSave);

  // Store last saved data in a ref for comparison in findWhatsChanged()
  const lastSavedDataRef = useRef(null);

  // Initialize react-hook-form - this will be the single source of truth for form data
  const hookForm = useForm({
    mode: 'onBlur',
    defaultValues: {
      ...defaultValues,
      pageState: defaultPageState,
    },
    shouldUnregister: false,
  });

  const { reset, getValues } = hookForm;

  useHookFormLocalStorage(LOCAL_STORAGE_AR_DATA_KEY(activityReportId), hookForm);

  const [initialAdditionalData, updateAdditionalData] = useLocalStorage(
    LOCAL_STORAGE_AR_ADDITIONAL_DATA_KEY(activityReportId), {
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
    LOCAL_STORAGE_AR_EDITABLE_KEY(activityReportId), (activityReportId === 'new'), currentPage !== 'review',
  );

  const [isCollaboratorOrCreator, setIsCollaboratorOrCreator] = useState(false);

  const [errorMessage, updateErrorMessage] = useState();
  // this attempts to track whether or not we're online
  // (or at least, if the backend is responding)
  const [connectionActive, setConnectionActive] = useState(true);

  const [creatorNameWithRole, updateCreatorRoleWithName] = useState('');
  const reportId = useRef();
  const { user } = useContext(UserContext);

  // Track if form has been initialized with data from the server
  const [isFormInitialized, setIsFormInitialized] = useState(false);

  const showLastUpdatedTime = (
    location.state && location.state.showLastUpdatedTime && connectionActive
  ) || false;

  useEffect(() => {
    // Clear history state once mounted and activityReportId changes. This prevents someone from
    // seeing a save message if they refresh the page after creating a new report.
    history.replace();
  }, [activityReportId, history]);

  useLocalStorageCleanup(isFormInitialized ? getValues() : null, activityReportId);

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
            version: 3,
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

        // If the report creator is in the collaborators list, remove them.
        const filteredCollaborators = collaborators.filter((c) => c.id !== report.userId);

        const isCollaborator = report.activityReportCollaborators
          && report.activityReportCollaborators.find((u) => u.userId === user.id);

        const isAuthor = report.userId === user.id;

        // The report can be edited if its in draft OR needs_action state.
        const isMatchingApprover = report.approvers.filter((a) => a.user && a.user.id === user.id);

        setIsCollaboratorOrCreator(isCollaborator || isAuthor);

        const canWriteAsCollaboratorOrAuthor = (isCollaborator || isAuthor)
        && (report.calculatedStatus === REPORT_STATUSES.DRAFT
          || report.calculatedStatus === REPORT_STATUSES.NEEDS_ACTION);

        const canWriteAsApprover = (isMatchingApprover && isMatchingApprover.length > 0 && (
          report.calculatedStatus === REPORT_STATUSES.SUBMITTED
          || report.calculatedStatus === REPORT_STATUSES.NEEDS_ACTION)
        );

        // Add recipientIds to groups.
        // TODO remove for standard goals.
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
          collaborators: filteredCollaborators || [],
          availableApprovers: availableApprovers || [],
          groups: groupsWithRecipientIds || [],
        });

        let dataToStore = report;

        // Check localStorage for newer data before resetting form
        try {
          const localStorageKey = LOCAL_STORAGE_AR_DATA_KEY(activityReportId);
          const stored = window.localStorage.getItem(localStorageKey);

          if (stored) {
            const localData = JSON.parse(stored);

            // Compare timestamps to determine which data is newer
            const localTimestamp = localData && localData.savedToStorageTime
              ? new Date(localData.savedToStorageTime)
              : null;

            const serverTimestamp = report.updatedAt
              ? new Date(report.updatedAt)
              : null;

            // If localStorage data is newer, prefer it
            const shouldUseLocalStorage = localTimestamp
              && (!serverTimestamp || localTimestamp > serverTimestamp);

            if (shouldUseLocalStorage) {
              // Merge localStorage data with fetched report
              // This preserves server fields while using newer form edits
              dataToStore = {
                ...report,
                ...localData,
              };
            }
          }
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error('Error loading from localStorage during fetch:', err);
        }

        reset(dataToStore);
        lastSavedDataRef.current = dataToStore;
        setIsFormInitialized(true);

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

        const canWriteReport = canWriteAsCollaboratorOrAuthor || canWriteAsApprover;

        updateEditable(canWriteReport);

        if (showLastUpdatedTime) {
          updateLastSaveTime(new Date(report.updatedAt));
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
        if (!isFormInitialized && !connection) {
          const fallbackData = { ...defaultValues, pageState: defaultPageState };
          reset(fallbackData);
          lastSavedDataRef.current = fallbackData;
          setIsFormInitialized(true);
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

  const formData = isFormInitialized ? getValues() : null;
  if (!formData) {
    return 'loading...';
  }

  if (error && !formData) {
    return (
      <Alert type="error">
        {error}
      </Alert>
    );
  }

  if (formData && formData.calculatedStatus === REPORT_STATUSES.APPROVED) {
    return (
      <Redirect to={`/activity-reports/view/${activityReportId}`} />
    );
  }

  if (connectionActive
    && isCollaboratorOrCreator
    && formData
    && formData.calculatedStatus === REPORT_STATUSES.SUBMITTED
    && !isPendingApprover
  ) {
    return (
      <Redirect to={`/activity-reports/submitted/${activityReportId}`} />
    );
  }

  const approverCanEdit = isApprover
    && formData
    && (
      formData.calculatedStatus === REPORT_STATUSES.SUBMITTED
      || formData.calculatedStatus === REPORT_STATUSES.NEEDS_ACTION
    );

  if (connectionActive && !editable && currentPage !== 'review' && !approverCanEdit) {
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
    if (!editable && !approverCanEdit) {
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
            regionId: data.regionId,
            approverUserIds: approverIds,
            version: 3,
            activityRecipientType: 'recipient',
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

        // Format the goals and objectives appropriately, as well as divide them
        // by which one is open and which one is not
        const { goalForEditing, goals } = convertGoalsToFormData(
          savedReport.goalsAndObjectives,
          savedReport.activityRecipients.map((r) => r.activityRecipientId),
          savedReport.calculatedStatus,
          savedReport.goalOrder,
        );

        // GOAL ORDER RECALCULATION: Ensure goalOrder is correct after backend returns goals
        //
        // WHY NEEDED: After saving to the backend, we need to recalculate goalOrder to ensure
        // it matches the current state of goals (including any goals being edited in place).
        //
        // HOW IT WORKS:
        // 1. Use packageGoals to reassemble all goals in their correct order
        //    (including goalForEditing at its originalIndex position)
        // 2. Calculate goalOrder from this correctly-ordered array
        // 3. If goalOrder differs from what the backend has, save it immediately
        //
        // EXAMPLE: If user is editing goal 1 at position 0, and backend returns goals ordered
        // by createdAt, we need to calculate the correct order [1, 2, 3] and save it.
        const grantIds = savedReport.activityRecipients.map((r) => r.activityRecipientId);
        const allGoalsInOrder = packageGoals(
          goals,
          goalForEditing,
          grantIds,
          goalForEditing?.prompts || [],
          goalForEditing?.originalIndex,
        );
        const goalOrder = extractGoalIdsInOrder(allGoalsInOrder);

        // If goalOrder changed from what backend has, persist the correct order immediately
        if (JSON.stringify(goalOrder) !== JSON.stringify(savedReport.goalOrder)) {
          await saveReport(
            reportId.current,
            { goalOrder },
            {},
          );
        }

        const reportData = {
          ...savedReport,
          goalForEditing,
          goals,
          goalOrder,
        };

        // Update ref with latest saved data
        lastSavedDataRef.current = reportData;

        // Return saved data to Navigator so it can update RHF
        return reportData;
      }
      const updatedReport = await formatReportWithSaveBeforeConversion(
        data,
        lastSavedDataRef.current,
        user,
        userHasOneRole,
        reportId,
        approverIds,
        forceUpdate,
      );

      let reportData = updatedReport;

      // format the goals and objectives appropriately, as well as divide them
      // by which one is open and which one is not
      const { goalForEditing, goals } = convertGoalsToFormData(
        updatedReport.goalsAndObjectives,
        updatedReport.activityRecipients.map((r) => r.activityRecipientId),
      );

      reportData = {
        ...updatedReport,
        goalForEditing,
        goals,
      };

      // Update ref with latest saved data
      lastSavedDataRef.current = reportData;
      setConnectionActive(true);
      updateCreatorRoleWithName(updatedReport.creatorNameWithRole);

      // Return saved data to Navigator so it can update RHF
      return reportData;
    } catch (e) {
      setConnectionActiveWithError(error, setConnectionActive);
      return null;
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

    const updatedData = {
      ...lastSavedDataRef.current,
      calculatedStatus: response.calculatedStatus,
      approvers: response.approvers,
    };

    // Update ref
    lastSavedDataRef.current = updatedData;
    updateEditable(false);

    cleanupLocalStorage(activityReportId);

    // Return updated data to Navigator so it can update RHF
    return updatedData;
  };

  const onReview = async (data) => {
    await reviewReport(reportId.current, { note: data.note, status: data.status });
  };

  const reportCreator = { name: user.name, roles: user.roles };
  const tagClass = formData && formData.calculatedStatus === REPORT_STATUSES.APPROVED ? 'smart-hub--tag-approved' : '';

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
      <Grid row>
        <Grid col="auto">
          <div className="margin-top-3 margin-bottom-5">
            <h1 className="font-serif-2xl text-bold line-height-serif-2 margin-0">
              Activity report for Region
              {' '}
              {formData && formData.regionId}
            </h1>
            {author}
          </div>
        </Grid>
        <Grid col="auto" className="flex-align-self-center">
          {formData && formData.calculatedStatus && (
            <div className={`${tagClass} smart-hub-status-label smart-hub--status-draft bg-gray-5 padding-x-2 padding-y-105 font-sans-md text-bold margin-bottom-2 margin-left-2`}>{startCase(formData.calculatedStatus)}</div>
          )}
        </Grid>
      </Grid>
      <NetworkContext.Provider value={
        {
          connectionActive: isOnlineMode() && connectionActive,
          localStorageAvailable: true,
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
          hookForm={hookForm}
          pages={pages}
          onFormSubmit={onFormSubmit}
          onSave={onSave}
          isApprover={isApprover}
          isPendingApprover={isPendingApprover} // is an approver and is pending their approval.
          onReview={onReview}
          errorMessage={errorMessage}
          updateErrorMessage={updateErrorMessage}
          shouldAutoSave={shouldAutoSave}
          setShouldAutoSave={setShouldAutoSave}
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
