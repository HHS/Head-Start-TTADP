/* eslint-disable react-hooks/exhaustive-deps */
import React, {
  useEffect,
  useState,
  useContext,
  useRef,
} from 'react';
import moment from 'moment';
import ReactRouterPropTypes from 'react-router-prop-types';
import { Helmet } from 'react-helmet';
import {
  Alert, Grid,
} from '@trussworks/react-uswds';
import { useHistory, Redirect } from 'react-router-dom';
import { FormProvider, useForm } from 'react-hook-form';
import { TRAINING_REPORT_STATUSES, isValidResourceUrl } from '@ttahub/common';
import { REPORT_STATUSES } from '@ttahub/common/src/constants';
import useSocket, { usePublishWebsocketLocationOnInterval } from '../../hooks/useSocket';
import useHookFormPageState from '../../hooks/useHookFormPageState';
import {
  defaultValues, baseDefaultValues, istKeys, pocKeys,
} from './constants';
import { createSession, getSessionBySessionId, updateSession } from '../../fetchers/session';
import NetworkContext, { isOnlineMode } from '../../NetworkContext';
import UserContext from '../../UserContext';
import Navigator from '../../components/Navigator';
import BackLink from '../../components/BackLink';
import AppLoadingContext from '../../AppLoadingContext';
import useSessionFormRoleAndPages from '../../hooks/useSessionFormRoleAndPages';
import { TRAINING_EVENT_ORGANIZER } from '../../Constants';
import './index.css';

// websocket publish location interval
const INTERVAL_DELAY = 10000; // TEN SECONDS

const reduceDataToMatchKeys = (keys, data) => keys.reduce((acc, key) => {
  if (data && Object.prototype.hasOwnProperty.call(data, key)) {
    acc[key] = data[key];
  }
  return acc;
}, {});

const determineKeyArray = ({
  isAdminUser,
  isPoc,
  isCollaborator,
  eventOrganizer,
  isApprover,
}) => {
  // eslint-disable-next-line max-len
  const isRegionalNoNationalCenters = TRAINING_EVENT_ORGANIZER.REGIONAL_TTA_NO_NATIONAL_CENTERS === eventOrganizer;

  let keyArray;
  if (isAdminUser || (isCollaborator && isRegionalNoNationalCenters) || isApprover) {
    keyArray = [...istKeys, ...pocKeys];
  } else if (isPoc) {
    keyArray = pocKeys;
  } else {
    keyArray = istKeys;
  }
  return keyArray;
};

/**
   * this is just a simple handler to "flatten"
   * the JSON column data into the form
   *
   * @param {fn} reset this is the hookForm.reset function (pass it a new set of values and it
   *  replaces the form with those values; it also calls the standard form.reset event
   * @param {*} event - not an HTML event, but the event object from the database, which has some
   * information stored at the top level of the object, and some stored in a data column
   */
const resetFormData = ({
  reset,
  updatedSession,
  isPocFromSession,
  isAdminUser,
  isCollaborator,
  isApprover,
  eventOrganizer = '',
}) => {
  const keyArray = determineKeyArray({
    isAdminUser,
    isPoc: isPocFromSession,
    isCollaborator,
    eventOrganizer,
    isApprover,
  });

  const {
    data,
    updatedAt,
    ...fields
  } = updatedSession;

  // Get all the DEFAULT VALUES that appear in the keyAarray.
  let roleDefaultValues = reduceDataToMatchKeys(keyArray, defaultValues);

  // Add the base default values to the role default values.
  roleDefaultValues = {
    ...baseDefaultValues,
    ...roleDefaultValues,
  };

  const roleData = reduceDataToMatchKeys(keyArray, data);

  const form = {
    ...roleDefaultValues,
    ...roleData,
    ...fields,
  };

  reset(form);
};

export default function SessionForm({ match }) {
  const { params: { sessionId, currentPage, trainingReportId } } = match;

  const reportId = useRef(sessionId);

  // for redirects if a page is not provided
  const history = useHistory();
  /* ============

     * the following errors are a bit confusingly named, but
     * I'm copying the pattern from the ActivityReport
     */

  // this error is for errors fetching reports, its the top error
  const [error, setError] = useState();

  // this is the error that appears in the sidebar
  const [errorMessage, updateErrorMessage] = useState();

  /* ============ */

  const [lastSaveTime, updateLastSaveTime] = useState(null);
  const [showSavedDraft, updateShowSavedDraft] = useState(false);

  // we use both of these to determine if we're in the loading screen state
  // (see the use effect below)
  const [reportFetched, setReportFetched] = useState(false);

  // this holds the key for the date pickers to force re-render
  // as the truss component doesn't re-render when the default value changes
  const [datePickerKey, setDatePickerKey] = useState(`i${Date.now().toString()}`);

  /* ============
    */
  const hookForm = useForm({
    mode: 'onBlur',
    defaultValues,
    shouldUnregister: false,
  });

  const formData = hookForm.getValues();

  const { user } = useContext(UserContext);
  const { setIsAppLoading } = useContext(AppLoadingContext);

  const eventOrganizer = formData.event?.data?.eventOrganizer || '';

  // eslint-disable-next-line max-len
  const isRegionalNoNationalCenters = TRAINING_EVENT_ORGANIZER.REGIONAL_TTA_NO_NATIONAL_CENTERS === eventOrganizer;

  const {
    socket,
    setSocketPath,
    socketPath,
    messageStore,
  } = useSocket(user);

  const {
    isPoc,
    isAdminUser,
    isCollaborator,
    isOwner,
    isApprover,
    applicationPages,
  } = useSessionFormRoleAndPages(hookForm);

  const redirectPagePath = applicationPages[0]?.path || null;

  useEffect(() => {
    if (!trainingReportId || !sessionId || !currentPage) {
      return;
    }

    if (!applicationPages.map((p) => p.path).includes(currentPage)) {
      return;
    }

    const newPath = `/training-report/${trainingReportId}/session/${sessionId}/${currentPage}`;
    setSocketPath(newPath);
  }, [sessionId, setSocketPath, trainingReportId, currentPage]);

  usePublishWebsocketLocationOnInterval(socket, socketPath, user, lastSaveTime, INTERVAL_DELAY);

  useEffect(() => {
    // if report isn't or created fetched, the app should be loading
    // (Report fetched is set in the use effect that fetches the report)
    const loading = !reportFetched;
    setIsAppLoading(loading);
  }, [reportFetched, setIsAppLoading]);

  useEffect(() => {
    // once report is fetched (in the use effect that fetches the report)
    // -- or created
    // we check to see if we have a session ID and aren't on a form page
    // if we aren't, redirect to the first form page
    if (reportFetched && sessionId && sessionId !== 'new' && !currentPage && redirectPagePath) {
      history.replace(`/training-report/${trainingReportId}/session/${sessionId}/${redirectPagePath}`);
    }
  }, [reportFetched, sessionId, currentPage, history, trainingReportId, redirectPagePath]);

  useEffect(() => {
    // create a new session
    async function createNewSession() {
      if (!trainingReportId || sessionId !== 'new' || reportFetched) {
        return;
      }

      try {
        const session = await createSession(trainingReportId);
        const isPocFromSession = session.event.pocIds.includes(user.id) && !isAdminUser;
        // eslint-disable-next-line max-len
        const isCollaboratorFromSession = session.event.collaboratorIds.includes(user.id) && !isAdminUser;
        const { event: { data: { eventOrganizerFromSession } } } = session;
        const { approverId } = session;
        const isApproverUser = user.id === Number(approverId);
        // we don't want to refetch if we've extracted the session data
        setReportFetched(true);
        resetFormData({
          reset: hookForm.reset,
          updatedSession: session,
          isPocFromSession,
          isAdminUser,
          isCollaborator: isCollaboratorFromSession,
          eventOrganizer: eventOrganizerFromSession,
          isApprover: isApproverUser,
        });
        reportId.current = session.id;

        if (session.event.ownerId === user.id && !isAdminUser) {
          history.push('/training-reports/in-progress', { message: 'Session created successfully' });
          return;
        }

        history.replace(`/training-report/${trainingReportId}/session/${session.id}`);
      } catch (e) {
        setError('Error creating session');
      } finally {
        // in case an error is thrown, we don't want to be stuck in the loading screen
        if (!reportFetched) {
          setReportFetched(true);
        }
      }
    }

    createNewSession();
  }, [history, hookForm.reset, reportFetched, sessionId, trainingReportId]);

  useEffect(() => {
    // fetch session data
    async function fetchSession() {
      if (reportFetched || sessionId === 'new') {
        return;
      }
      const viewTrUrl = `/training-report/view/${trainingReportId}`;
      try {
        const session = await getSessionBySessionId(sessionId);

        /**
         * handle the cases where we need to redirect away
         * we'll do this here inline instead of loading into state
         * (just to save render cycles)
         */

        // is it submitted?
        const { data: { submitted }, approverId } = session;
        const isApproverUser = user.id === Number(approverId);

        const isNeedsAction = session.data.status === REPORT_STATUSES.NEEDS_ACTION;
        const sessionComplete = session.data.status === TRAINING_REPORT_STATUSES.COMPLETE;

        const notSubmittedApprover = !submitted && isApproverUser && !isAdminUser;
        const needsActionApprover = submitted && isApproverUser && isNeedsAction;

        // eslint-disable-next-line max-len
        const isPocFromSession = (session.event.pocIds || []).includes(user.id) && !isAdminUser;
        // eslint-disable-next-line max-len
        const isCollaboratorFromSession = (session.event.collaboratorIds || []).includes(user.id) && !isAdminUser;

        const isOwnerFromSession = session.event.ownerId === user.id;

        // check the event organizer and user role
        const { event: { data: { eventOrganizer: eventOrganizerFromSession } } } = session;

        // eslint-disable-next-line max-len
        const isRegionalEventPoc = eventOrganizerFromSession === TRAINING_EVENT_ORGANIZER.REGIONAL_TTA_NO_NATIONAL_CENTERS && isPocFromSession && !isAdminUser;
        // eslint-disable-next-line max-len
        const isFormUser = (isPocFromSession || isOwnerFromSession || isCollaboratorFromSession) && !isAdminUser;

        const submittedFormUser = submitted && isFormUser && !isNeedsAction;
        const completeSessionFormUser = sessionComplete && (isFormUser || isApproverUser);

        // when do we redirect to the "View" page?
        if (
          notSubmittedApprover // approver, session not submitted yet
          || submittedFormUser // when the form is submitted and we are a form-filler
          || completeSessionFormUser // when the form is complete and we are a form-filler
          || needsActionApprover // when we are an approver and the form is needs action
          || isRegionalEventPoc // if it's a "regional" session and we are a POC (corner case)
        ) {
          history.push(viewTrUrl);
          return;
        }

        resetFormData({
          reset: hookForm.reset,
          updatedSession: session,
          isPocFromSession,
          isAdminUser,
          isCollaborator: isCollaboratorFromSession,
          eventOrganizer: eventOrganizerFromSession,
          isApprover: isApproverUser,
        });

        // we push approvers to the review page
        if (submitted && isApproverUser && !isNeedsAction && currentPage !== 'review') {
          history.push(`/training-report/${trainingReportId}/session/${session.id}/review`);
          return;
        }

        reportId.current = session.id;
      } catch (e) {
        history.push(`/something-went-wrong/${e.status}`);
      } finally {
        setReportFetched(true);
        setDatePickerKey(`f${Date.now().toString()}`);
      }
    }
    fetchSession();
  }, [hookForm.reset, reportFetched, sessionId, history]);

  // hook to update the page state in the sidebar
  useHookFormPageState(hookForm, applicationPages, currentPage);

  const updatePage = (position) => {
    const state = {};
    if (reportId.current) {
      state.showLastUpdatedTime = true;
    }

    const page = Object.values(applicationPages).find((p) => p.position === position);
    const newPath = `/training-report/${trainingReportId}/session/${reportId.current}/${page.path}`;
    history.push(newPath, state);
  };

  // Redirect if no page is specified, or if the specified page isn't available to this user
  const pageExists = currentPage && applicationPages.some((p) => p.path === currentPage);
  if (redirectPagePath && (!currentPage || !pageExists)) {
    return (
      <Redirect to={`/training-report/${trainingReportId}/session/${reportId.current}/${redirectPagePath}`} />
    );
  }

  /**
   * Removes or modifies completion tracking fields based on the current user's role.
   * This enforces role-based access control by preventing users from modifying
   * completion fields they are not authorized to edit.
   *
   * Behavior:
   * - Admin users can modify all completion fields (no changes made)
   * - POCs with national center facilitation: removes ownerComplete (tracked by owner)
   * - POCs in regional PD with national centers events: sets ownerComplete to true
   * - All other non-admin users: removes pocComplete (tracked by POC)
   *
   * @param {Object} roleData - The role-based session data object potentially containing
   *                             ownerComplete and pocComplete properties
   * @returns {Object} A shallow copy of roleData with completion fields removed or
   *                    modified based on the user's role
   */
  const removeCompleteDataBaseOnRole = (roleData) => {
    const updatedRoleData = { ...roleData };
    if (!isAdminUser) {
      if (isPoc && roleData.facilitation === 'national_center') {
      // Remove ownerComplete as this is tracked from the owner.
        delete updatedRoleData.ownerComplete;
      } else if (
        isPoc && eventOrganizer === TRAINING_EVENT_ORGANIZER.REGIONAL_PD_WITH_NATIONAL_CENTERS
      ) {
        updatedRoleData.ownerComplete = true;
      } else {
        // Remove pocComplete as this is tracked from the POC.
        delete updatedRoleData.pocComplete;
      }
    }
    return updatedRoleData;
  };

  const onSave = async () => {
    // Only do this if the session is not complete.
    if (formData.status !== TRAINING_REPORT_STATUSES.COMPLETE) {
      try {
        // reset the error message
        setError('');
        setIsAppLoading(true);
        hookForm.clearErrors();

        // grab the newest data from the form
        const data = hookForm.getValues();

        const keyArray = determineKeyArray({
          isAdminUser,
          isPoc,
          eventOrganizer,
          isCollaborator,
          isApprover,
        });
        let roleData = reduceDataToMatchKeys(keyArray, data);

        // Remove complete property data based on current role.
        roleData = removeCompleteDataBaseOnRole(roleData);

        if (!isPoc && roleData.objectiveResources) {
          roleData = {
            ...roleData,
            objectiveResources: data.objectiveResources.filter((r) => (
              r && isValidResourceUrl(r.value))),
          };
        }

        // PUT it to the backend
        const updatedSession = await updateSession(sessionId, {
          data: {
            ...roleData,
            status: TRAINING_REPORT_STATUSES.IN_PROGRESS,
          },
          trainingReportId,
          eventId: trainingReportId || null,
        });

        updateLastSaveTime(moment(updatedSession.updatedAt));
        updateShowSavedDraft(true);
      } catch (err) {
        setError('There was an error saving the session. Please try again later.');
      } finally {
        setIsAppLoading(false);
      }
    }
  };

  const onSaveAndContinue = async () => {
    if (formData.status !== TRAINING_REPORT_STATUSES.COMPLETE) {
      try {
        setError('');
        await onSave();
      } catch (e) {
        setError('There was an error saving the session report');
      }
      updateShowSavedDraft(false);
    }
    const whereWeAre = applicationPages.find((p) => p.path === currentPage);
    const nextPage = applicationPages.find((p) => p.position === whereWeAre.position + 1);

    if (nextPage) {
      updatePage(nextPage.position);
    }
  };

  const onReview = async () => {
    try {
      await hookForm.trigger();

      // reset the error message
      setError('');
      setIsAppLoading(true);

      // grab the newest data from the form
      const {
        approvalStatus,
        ...data
      } = hookForm.getValues();

      const status = (() => {
        if (approvalStatus === REPORT_STATUSES.APPROVED) {
          return TRAINING_REPORT_STATUSES.COMPLETE;
        }

        if (approvalStatus === REPORT_STATUSES.NEEDS_ACTION) {
          return REPORT_STATUSES.NEEDS_ACTION;
        }

        return '';
      })();

      if (!status) {
        return;
      }

      // PUT it to the backend
      await updateSession(sessionId, {
        data: {
          ...data,
          status,
        },
        trainingReportId,
        eventId: trainingReportId || null,
      });

      history.push('/training-reports/in-progress', { message: 'You successfully submitted the session.' });
    } catch (err) {
      setError('There was an error saving the session report. Please try again later.');
    } finally {
      setIsAppLoading(false);
    }
  };

  const onFormSubmit = async () => {
    try {
      await hookForm.trigger();

      // reset the error message
      setError('');
      setIsAppLoading(true);

      // grab the newest data from the form
      const {
        ...data
      } = hookForm.getValues();

      // Get form data based on role IST vs POC.
      const keyArray = determineKeyArray({
        isAdminUser,
        isPoc,
        eventOrganizer,
        isCollaborator,
        isApprover,
      });
      let roleData = reduceDataToMatchKeys(keyArray, data);

      // If we are a POC submitting set POC submitted values in data.
      if (isPoc || isAdminUser) {
        roleData.pocComplete = true;
        roleData.pocCompleteId = user.id;
        roleData.pocCompleteDate = moment().format('YYYY-MM-DD');
      }

      // Owner, collaborator, and admin can submitted the session.
      if (isOwner || isCollaborator || isAdminUser) {
        roleData.ownerComplete = true;
        roleData.ownerCompleteId = user.id;
        roleData.ownerCompleteDate = moment().format('YYYY-MM-DD');
      }

      // Remove complete property data based on current role.
      roleData = removeCompleteDataBaseOnRole(roleData);

      // PUT it to the backend
      await updateSession(sessionId, {
        data: {
          ...roleData,
          ...(isRegionalNoNationalCenters && roleData.pocComplete ? { pocComplete: true } : {}),
          status: TRAINING_REPORT_STATUSES.IN_PROGRESS,
          dateSubmitted: moment().format('MM/DD/YYYY'), // date the session was submitted
          submitter: user.fullName, // user submitted the session for approval
        },
        trainingReportId,
        eventId: trainingReportId || null,
      });

      history.push('/training-reports/in-progress', { message: 'You successfully submitted the session.' });
    } catch (err) {
      setError('There was an error saving the session report. Please try again later.');
    } finally {
      setIsAppLoading(false);
    }
  };

  const reportCreator = { name: user.name, roles: user.roles };

  // retrieve the last time the data was saved to local storage
  const savedToStorageTime = formData ? formData.savedToStorageTime : null;

  if (!reportFetched) {
    return null;
  }

  // Don't render until we have valid pages for the user's role
  if (applicationPages.length === 0) {
    return null;
  }

  const { event } = formData;

  return (
    <div className="smart-hub-training-report--session">
      { error
        && (
        <Alert type="error" className="margin-bottom-3">
          {error}
        </Alert>
        )}
      <Helmet titleTemplate="%s - Training Report | TTA Hub" defaultTitle="Session - Training Report | TTA Hub" />
      <BackLink to="/training-reports/in-progress">
        Back to Training Reports
      </BackLink>
      <Grid row className="flex-justify">
        <Grid col="auto">
          <div className="margin-top-2 margin-bottom-4">
            <h1 className="font-serif-2xl text-bold line-height-serif-2 margin-0 margin-bottom-1">
              Training report - Session
            </h1>
            <div className="lead-paragraph">
              {formData.eventId}
              :
              {' '}
              {formData.event.data.eventName}
            </div>
          </div>
        </Grid>
      </Grid>
      <NetworkContext.Provider value={{ connectionActive: isOnlineMode() }}>
        {/* eslint-disable-next-line react/jsx-props-no-spreading */}
        <FormProvider {...hookForm}>
          <Navigator
            deadNavigation={isApprover}
            datePickerKey={datePickerKey}
            socketMessageStore={messageStore}
            key={currentPage}
            editable
            updatePage={updatePage}
            reportCreator={reportCreator}
            lastSaveTime={lastSaveTime}
            updateLastSaveTime={updateLastSaveTime}
            reportId={reportId.current}
            currentPage={currentPage}
            additionalData={{
              status: formData.status,
              pages: applicationPages,
              isAdminUser,
              event,
              approvers: [],
            }}
            formData={formData}
            pages={applicationPages}
            onFormSubmit={onFormSubmit}
            onSave={onSave}
            isApprover={false}
            isPendingApprover={false}
            onReview={onReview}
            errorMessage={errorMessage}
            updateErrorMessage={updateErrorMessage}
            savedToStorageTime={savedToStorageTime}
            onSaveDraft={onSave}
            onSaveAndContinue={onSaveAndContinue}
            showSavedDraft={showSavedDraft}
            updateShowSavedDraft={updateShowSavedDraft}
            formDataStatusProp="reviewStatus"
          />
        </FormProvider>
      </NetworkContext.Provider>
    </div>
  );
}

SessionForm.propTypes = {
  match: ReactRouterPropTypes.match.isRequired,
};
