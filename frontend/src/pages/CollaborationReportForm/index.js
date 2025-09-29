/* eslint-disable react/jsx-props-no-spreading */
/*
  Collaboration report. Makes use of the navigator to split the long form into
  multiple pages. Each "page" is defined in the `./Pages` directory.
*/
import React, {
  useState, useEffect, useRef, useContext, useMemo,
} from 'react';
import PropTypes from 'prop-types';
import { startCase, keyBy, mapValues } from 'lodash';
import { Helmet } from 'react-helmet';
import ReactRouterPropTypes from 'react-router-prop-types';
import { useHistory, Redirect } from 'react-router-dom';
import { Alert, Grid } from '@trussworks/react-uswds';
import { FormProvider, useForm } from 'react-hook-form';
import { REPORT_STATUSES, DECIMAL_BASE } from '@ttahub/common';
import moment from 'moment';
import useDeepCompareEffect from 'use-deep-compare-effect';
import pages from './Pages';
import Navigator from '../../components/Navigator';
import { NOT_STARTED } from './constants';
import { convertReportToFormData, isDateValid, findWhatsChanged } from './formDataHelpers';
import {
  LOCAL_STORAGE_CR_DATA_KEY,
  LOCAL_STORAGE_CR_ADDITIONAL_DATA_KEY,
  LOCAL_STORAGE_CR_EDITABLE_KEY,
} from '../../Constants';
import { getRegionWithReadWrite } from '../../permissions';
import useTTAHUBLocalStorage from '../../hooks/useTTAHUBLocalStorage';
import {
  createReport,
  getReport,
  reviewReport,
  saveReport,
  submitReport,
} from '../../fetchers/collaborationReports';
import { getCollaborators } from '../../fetchers/collaborators';
import useLocalStorage, { setConnectionActiveWithError } from '../../hooks/useLocalStorage';
import AppLoadingContext from '../../AppLoadingContext';
import NetworkContext, { isOnlineMode } from '../../NetworkContext';
import UserContext from '../../UserContext';
import MeshPresenceManager from '../../components/MeshPresenceManager';
import useLocalStorageCleanup from '../../hooks/useLocalStorageCleanup';
import usePresenceData from '../../hooks/usePresenceData';
import { getApprovers } from '../../fetchers/activityReports';
import useHookFormPageState from '../../hooks/useHookFormPageState';

// Default values for a new collaboration report go here
const defaultValues = {
  approvers: [],
  pageState: {
    1: NOT_STARTED,
    2: NOT_STARTED,
    3: NOT_STARTED,
    4: NOT_STARTED,
  },
  calculatedStatus: REPORT_STATUSES.DRAFT,
  collabReportSpecialists: [],
};

const pagesByPos = keyBy(pages.filter((p) => !p.review), (page) => page.position);
const defaultPageState = mapValues(pagesByPos, () => NOT_STARTED);

export const formatReportWithSaveBeforeConversion = async (
  data,
  formData,
  user,
  userHasOneRole,
  reportId,
  forceUpdate,
) => {
  // if it isn't a new report, we compare it to the last response from the backend (formData)
  // and pass only the updated to save report
  const creatorRole = !data.creatorRole && userHasOneRole
    ? user.roles[0].fullName
    : data.creatorRole;

  const updatedFields = findWhatsChanged({ ...data, creatorRole }, formData) || {};
  const isEmpty = Object.keys(updatedFields).length === 0;

  // save report returns dates in YYYY-MM-DD format, so we need to parse them
  // formData stores them as MM/DD/YYYY so we are good in that instance
  const thereIsANeedToParseDates = !isEmpty;
  const updatedReport = isEmpty && !forceUpdate
    ? formData
    : await saveReport(
      reportId.current, {
        ...updatedFields,
        version: 3,
      }, {},
    );

  let reportData = {
    ...updatedReport,
  };

  if (thereIsANeedToParseDates) {
    // Check if dates are in YYYY-MM-DD format before parsing
    const isYMDFormat = updatedReport.startDate
      && updatedReport.startDate.match(/^\d{4}-\d{2}-\d{2}$/);
    if (isYMDFormat) {
      reportData = {
        ...reportData,
        startDate: moment(updatedReport.startDate, 'YYYY-MM-DD').format('MM/DD/YYYY'),
        endDate: moment(updatedReport.endDate, 'YYYY-MM-DD').format('MM/DD/YYYY'),
      };
    } else {
      // Preserve existing dates if API doesn't return them or they're in wrong format
      reportData.startDate = reportData.startDate || formData.startDate;
      reportData.endDate = reportData.endDate || formData.endDate;
    }
  }

  return reportData;
};

function CollaborationReport({ match, location }) {
  const { params: { currentPage, collabReportId } } = match;

  const hookForm = useForm({
    mode: 'onBlur',
    defaultValues,
    shouldUnregister: false,
  });

  const history = useHistory();
  const [error, updateError] = useState();
  const [loading, updateLoading] = useState(true);
  // App Loading Context.
  const { isAppLoading, setIsAppLoading, setAppLoadingText } = useContext(AppLoadingContext);

  const [lastSaveTime, updateLastSaveTime] = useState(null);
  const [showSavedDraft, updateShowSavedDraft] = useState(false);

  const [shouldAutoSave, setShouldAutoSave] = useState(true);
  const {
    presenceData,
    handlePresenceUpdate,
  } = usePresenceData(setShouldAutoSave);

  // hook to update the page state in the sidebar
  useHookFormPageState(hookForm, pages, currentPage);

  const [formData, updateFormData, localStorageAvailable] = useTTAHUBLocalStorage(
    LOCAL_STORAGE_CR_DATA_KEY(collabReportId), null,
  );

  // retrieve the last time the data was saved to local storage
  const savedToStorageTime = formData ? formData.savedToStorageTime : null;

  const [additionalData, updateAdditionalData] = useLocalStorage(
    LOCAL_STORAGE_CR_ADDITIONAL_DATA_KEY(collabReportId), {},
  );
  const [isApprover, updateIsApprover] = useState(false);
  // If the user is one of the approvers on this report and is still pending approval.
  const [isPendingApprover, updateIsPendingApprover] = useState(false);
  const [editable, updateEditable] = useLocalStorage(
    LOCAL_STORAGE_CR_EDITABLE_KEY(collabReportId), (collabReportId === 'new'), currentPage !== 'review',
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

  const userHasOneRole = useMemo(() => user && user.roles && user.roles.length === 1, [user]);

  useEffect(() => {
    // Clear history state once mounted and collabReportId changes. This prevents someone from
    // seeing a save message if they refresh the page after creating a new report.
    history.replace();
  }, [collabReportId, history]);

  const cleanupLocalStorage = useLocalStorageCleanup(
    formData,
    collabReportId,
    LOCAL_STORAGE_CR_DATA_KEY,
    LOCAL_STORAGE_CR_EDITABLE_KEY,
    LOCAL_STORAGE_CR_ADDITIONAL_DATA_KEY,
  );

  // A new form page is being shown so we need to reset `react-hook-form` so validations are
  // reset and the proper values are placed inside inputs
  useDeepCompareEffect(() => {
    hookForm.reset(formData);
  }, [currentPage, formData, hookForm.reset]);

  useDeepCompareEffect(() => {
    const fetch = async () => {
      let report;

      try {
        updateLoading(true);
        reportId.current = collabReportId;

        if (collabReportId !== 'new') {
          let fetchedReport;
          try {
            fetchedReport = await getReport(collabReportId);
            const {
              submissionStatus,
              approvers,
              calculatedStatus,
            } = fetchedReport;

            // Before bothering with form data parsing or rendering, let us
            // make sure we BELONG here
            const isApproved = calculatedStatus === REPORT_STATUSES.APPROVED;
            const isSubmitted = submissionStatus === REPORT_STATUSES.SUBMITTED;
            // eslint-disable-next-line max-len
            const isApproverFromFetched = approvers.some(({ user: approver }) => user.id === approver.id);
            const isNeedsAction = calculatedStatus === REPORT_STATUSES.NEEDS_ACTION;

            if (isApproved || (isSubmitted && !isApproverFromFetched && !isNeedsAction)) {
              // redirect to approved/submitted report view
              history.push(`/collaboration-reports/view/${fetchedReport.id}`);
              return;
            }
          } catch (e) {
            // If error retrieving the report show the "something went wrong" page.
            history.replace('/something-went-wrong/500');
            return;
          }
          report = convertReportToFormData(fetchedReport);
          // Ensure pageState is initialized if not present in fetched data
          if (!report.pageState) {
            report.pageState = defaultPageState;
          }
        } else {
          report = {
            ...defaultValues,
            creatorRole: userHasOneRole ? user.roles[0].fullName : null,
            pageState: defaultPageState,
            userId: user.id,
            regionId: getRegionWithReadWrite(user),
            version: 2,
          };
        }

        const apiCalls = [
          getCollaborators(report.regionId),
          getApprovers(report.regionId),
        ];

        const [collaborators, approvers] = await Promise.all(apiCalls);

        // If the report creator is in the collaborators list, remove them.
        const filteredCollaborators = collaborators.filter((c) => c.id !== report.userId);

        const isCollaborator = report.collabReportSpecialists
          && report.collabReportSpecialists.some((u) => u.specialistId === user.id);
        const isAuthor = report.userId === user.id;
        const isMatchingApprover = report.approvers.filter((a) => a.user && a.user.id === user.id);

        const canWriteAsCollaboratorOrAuthor = (isCollaborator || isAuthor)
        && (report.calculatedStatus === REPORT_STATUSES.DRAFT
          || report.calculatedStatus === REPORT_STATUSES.NEEDS_ACTION);
        const canWriteAsApprover = (isMatchingApprover && isMatchingApprover.length > 0 && (
          report.calculatedStatus === REPORT_STATUSES.SUBMITTED)
        );

        updateAdditionalData({
          collaborators: filteredCollaborators || [],
          approvers: approvers || [],
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
        if (shouldUpdateFromNetwork && collabReportId !== 'new') {
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
        const connection = true; // setConnectionActiveWithError(e, setConnectionActive);
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
        const errorMsg = !connection ? networkErrorMessage : <>Unable to load report</>;
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
  }, [collabReportId, user, showLastUpdatedTime]);

  if (loading) {
    return (
      <div>
        loading...
      </div>
    );
  }

  // This error message is a catch all assuming that the network storage is working
  if (error && !formData) {
    return (
      <Alert type="error">
        {error}
      </Alert>
    );
  }

  if (!currentPage) {
    return (
      <Redirect to={`/collaboration-reports/${collabReportId}/activity-summary`} />
    );
  }

  const updatePage = (position) => {
    if (!editable) {
      return;
    }

    const state = {};
    if (collabReportId === 'new' && reportId.current !== 'new') {
      state.showLastUpdatedTime = true;
    }

    const page = pages.find((p) => p.position === position);
    if (page) {
      const newPath = `/collaboration-reports/${reportId.current}/${page.path}`;
      history.push(newPath, state);
    }
  };

  const onSave = async (data, forceUpdate = false) => {
    try {
      if (reportId.current === 'new') {
        const fields = data;

        if (!isDateValid(fields.startDate)) {
          delete fields.startDate;
        }

        if (!isDateValid(fields.endDate)) {
          delete fields.endDate;
        }

        const savedReport = await createReport({
          ...fields,
          regionId: formData.regionId,
          version: 2,
        });

        if (!savedReport) {
          throw new Error('Report not found');
        }

        reportId.current = savedReport.id;

        cleanupLocalStorage('new', savedReport.id);

        window.history.replaceState(null, null, `/collaboration-reports/${savedReport.id}/${currentPage}`);

        const currentPageState = hookForm.getValues('pageState');
        const convertedReport = convertReportToFormData(savedReport);
        updateFormData({
          ...convertedReport,
          pageState: currentPageState || convertedReport.pageState,
        }, true);
        setConnectionActive(true);
        updateCreatorRoleWithName(savedReport.creatorNameWithRole);
      } else {
        const updatedReport = await formatReportWithSaveBeforeConversion(
          data,
          formData,
          user,
          userHasOneRole,
          reportId,
          forceUpdate,
        );

        const currentPageState = hookForm.getValues('pageState');
        const convertedReport = convertReportToFormData(updatedReport);
        updateFormData({ ...convertedReport, pageState: currentPageState }, true);
        setConnectionActive(true);
        updateCreatorRoleWithName(updatedReport.creatorNameWithRole);
      }
    } catch (e) {
      setConnectionActiveWithError(e, setConnectionActive);
    }
  };

  const setSavingLoadScreen = (isAutoSave = false) => {
    if (!isAutoSave && !isAppLoading) {
      setAppLoadingText('Saving');
      setIsAppLoading(true);
    }
  };

  const onSaveDraft = async (isAutoSave = false, forceUpdate = false) => {
    try {
      // Turn on loading screen
      setSavingLoadScreen(isAutoSave);

      // If not editable, don't show the loading screen
      if (!editable) {
        setIsAppLoading(false);
        return;
      }

      // Get the current form data
      const { status, ...formValues } = hookForm.getValues();
      // TODO: Add 'pageState' and newNavigatorState to the saved data
      const data = { ...formData, ...formValues };

      // Clear the previous error message if there is one
      updateErrorMessage();

      // save the form data to the server
      await onSave(data, forceUpdate);

      // Update the last saved time
      updateLastSaveTime(moment());

      // show the saved draft message
      updateShowSavedDraft(true);
    } catch (e) {
      updateErrorMessage('A network error has prevented us from saving your collaboration report to our database. Your work is safely saved to your web browser in the meantime.');
    } finally {
      setIsAppLoading(false);
    }
  };

  const onFormSubmit = async (data) => {
    const reportToSubmit = {
      additionalNotes: data.additionalNotes,
      creatorRole: data.creatorRole,
      approvers: data.approvers,
    };
    await submitReport(reportId.current, reportToSubmit);
    cleanupLocalStorage(collabReportId);
    history.push('/collaboration-reports/'); // TODO: message
  };

  const onSaveAndContinue = async () => {
    const validity = await hookForm.trigger();
    if (!validity) {
      return;
    }

    const currentPosition = pages.find((page) => page.path === currentPage)?.position;

    const isAutoSave = false;
    await onSaveDraft(isAutoSave);
    updatePage(currentPosition + 1);
  };

  const onReview = async (data) => {
    await reviewReport(reportId.current, { note: data.note, status: data.status });
  };

  const reportCreator = { name: user.name, roles: user.roles };
  const tagClass = formData && formData.calculatedStatus === REPORT_STATUSES.APPROVED ? 'smart-hub--tag-approved' : '';
  // eslint-disable-next-line max-len
  const hideSideNav = formData && formData.calculatedStatus === REPORT_STATUSES.SUBMITTED && !isApprover;

  const author = creatorNameWithRole ? (
      // eslint-disable-next-line react/jsx-indent
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
    <div className="smart-hub-collab-report">
      { error
      && (
      <Alert type="warning">
        {error}
      </Alert>
      )}
      {renderMultiUserAlert() || renderMultipleTabAlert()}
      {/* Don't render the Mesh component unless working on a saved report */}
      { collabReportId !== 'new' && (<MeshPresenceManager room={`cr-${collabReportId}`} onPresenceUpdate={handlePresenceUpdate} onRevisionUpdate={handleRevisionUpdate} />)}
      <Helmet titleTemplate="%s - Collaboration Report | TTA Hub" defaultTitle="Collaboration Report | TTA Hub" />
      <Grid row className="flex-justify">
        <Grid col="auto">
          <div className="margin-top-3 margin-bottom-5">
            <h1 className="font-serif-2xl text-bold line-height-serif-2 margin-0">
              Collaboration report for Region
              {' '}
              {formData.regionId}
            </h1>
            {author}
          </div>
        </Grid>
        {!hideSideNav && (
        <Grid col="auto" className="flex-align-self-center">
          {formData.calculatedStatus && (
            <div className={`${tagClass} smart-hub-status-label bg-gray-5 padding-x-2 padding-y-105 font-sans-md text-bold`}>{startCase(formData.calculatedStatus)}</div>
          )}
        </Grid>
        )}
      </Grid>
      <NetworkContext.Provider value={
        {
          connectionActive: isOnlineMode() && connectionActive,
          localStorageAvailable,
        }
      }
      >
        <FormProvider {...hookForm}>
          <Navigator
            formData={formData}
            pages={pages}
            onFormSubmit={onFormSubmit}
            onReview={onReview}
            currentPage={currentPage}
            additionalData={additionalData}
            onSave={onSave}
            isApprover={isApprover}
            isPendingApprover={isPendingApprover}
            reportId={reportId.current}
            updatePage={updatePage}
            reportCreator={reportCreator}
            lastSaveTime={lastSaveTime}
            errorMessage={errorMessage}
            updateErrorMessage={updateErrorMessage}
            savedToStorageTime={savedToStorageTime}
            onSaveDraft={onSaveDraft}
            onSaveAndContinue={onSaveAndContinue}
            showSavedDraft={showSavedDraft}
            updateShowSavedDraft={updateShowSavedDraft}
            shouldAutoSave={shouldAutoSave}
          />
        </FormProvider>
      </NetworkContext.Provider>
    </div>
  );
}

CollaborationReport.propTypes = {
  match: ReactRouterPropTypes.match.isRequired,
  location: ReactRouterPropTypes.location.isRequired,
  region: PropTypes.number,
};

CollaborationReport.defaultProps = {
  region: undefined,
};

export default CollaborationReport;
