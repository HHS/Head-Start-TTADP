import React, {
  useEffect,
  useState,
  useContext,
  useRef,
} from 'react';
import moment from 'moment';
import ReactRouterPropTypes from 'react-router-prop-types';
import { Helmet } from 'react-helmet';
import { Alert, Grid } from '@trussworks/react-uswds';
import { useHistory, Redirect } from 'react-router-dom';
import { FormProvider, useForm } from 'react-hook-form';
import { TRAINING_REPORT_STATUSES, isValidResourceUrl } from '@ttahub/common';
import useSocket, { usePublishWebsocketLocationOnInterval } from '../../hooks/useSocket';
import useHookFormPageState from '../../hooks/useHookFormPageState';
import { defaultValues } from './constants';
import { createSession, getSessionBySessionId, updateSession } from '../../fetchers/session';
import NetworkContext, { isOnlineMode } from '../../NetworkContext';
import UserContext from '../../UserContext';
import Navigator from '../../components/Navigator';
import BackLink from '../../components/BackLink';
import pages from './pages';
import AppLoadingContext from '../../AppLoadingContext';

// websocket publish location interval
const INTERVAL_DELAY = 10000; // TEN SECONDS

/**
   * this is just a simple handler to "flatten"
   * the JSON column data into the form
   *
   * @param {fn} reset this is the hookForm.reset function (pass it a new set of values and it
   *  replaces the form with those values; it also calls the standard form.reset event
   * @param {*} event - not an HTML event, but the event object from the database, which has some
   * information stored at the top level of the object, and some stored in a data column
   */
const resetFormData = (reset, updatedSession) => {
  const {
    data,
    updatedAt,
    ...fields
  } = updatedSession;

  const form = {
    ...defaultValues,
    ...data,
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

  const {
    socket,
    setSocketPath,
    socketPath,
    messageStore,
  } = useSocket(user);

  useEffect(() => {
    if (!trainingReportId || !sessionId) {
      return;
    }
    const newPath = `/training-report/${trainingReportId}/session/${sessionId}`;
    setSocketPath(newPath);
  }, [sessionId, setSocketPath, trainingReportId]);

  usePublishWebsocketLocationOnInterval(socket, socketPath, user, lastSaveTime, INTERVAL_DELAY);

  useEffect(() => {
    const loading = !reportFetched;
    setIsAppLoading(loading);
  }, [reportFetched, setIsAppLoading]);

  useEffect(() => {
    // create a new session
    async function createNewSession() {
      if (!trainingReportId || !currentPage || sessionId !== 'new' || reportFetched) {
        return;
      }

      try {
        const session = await createSession(trainingReportId);

        // we don't want to refetch if we've extracted the session data
        setReportFetched(true);
        resetFormData(hookForm.reset, session);
        reportId.current = session.id;
        history.replace(`/training-report/${trainingReportId}/session/${session.id}/${currentPage}`);
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
  }, [currentPage, history, hookForm.reset, reportFetched, sessionId, trainingReportId]);

  useEffect(() => {
    // fetch event report data
    async function fetchSession() {
      if (!currentPage || reportFetched || sessionId === 'new') {
        return;
      }
      try {
        const session = await getSessionBySessionId(sessionId);
        resetFormData(hookForm.reset, session);
        reportId.current = session.id;
      } catch (e) {
        setError('Error fetching session');
      } finally {
        setReportFetched(true);
        setDatePickerKey(`f${Date.now().toString()}`);
      }
    }
    fetchSession();
  }, [currentPage, hookForm.reset, reportFetched, sessionId]);

  // hook to update the page state in the sidebar
  useHookFormPageState(hookForm, pages, currentPage);

  const updatePage = (position) => {
    const state = {};
    if (reportId.current) {
      state.showLastUpdatedTime = true;
    }

    const page = pages.find((p) => p.position === position);
    const newPath = `/training-report/${trainingReportId}/session/${reportId.current}/${page.path}`;
    history.push(newPath, state);
  };

  if (!currentPage) {
    return (
      <Redirect to={`/training-report/${trainingReportId}/session/${reportId.current}/session-summary`} />
    );
  }

  const onSave = async () => {
    try {
      // reset the error message
      setError('');
      setIsAppLoading(true);
      hookForm.clearErrors();

      // grab the newest data from the form
      const data = hookForm.getValues();

      // PUT it to the backend
      const updatedSession = await updateSession(sessionId, {
        data: {
          ...data,
          objectiveResources: data.objectiveResources.filter((r) => (
            r && isValidResourceUrl(r.value))),
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
  };

  const onSaveAndContinue = async () => {
    const whereWeAre = pages.find((p) => p.path === currentPage);
    const nextPage = pages.find((p) => p.position === whereWeAre.position + 1);
    await onSave();
    updateShowSavedDraft(false);
    if (nextPage) {
      updatePage(nextPage.position);
    }
  };

  const onFormSubmit = async (updatedStatus) => {
    try {
      await hookForm.trigger();

      // reset the error message
      setError('');
      setIsAppLoading(true);

      // grab the newest data from the form
      const {
        ...data
      } = hookForm.getValues();

      // PUT it to the backend
      await updateSession(sessionId, {
        data: {
          ...data,
          status: updatedStatus,
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

  if (reportFetched && formData.status === TRAINING_REPORT_STATUSES.COMPLETE) {
    return (
      <Redirect to={`/training-report/view/${trainingReportId}`} />
    );
  }

  return (
    <div className="smart-hub-training-report--session">
      { error
        && (
        <Alert type="warning">
          {error}
        </Alert>
        )}
      <Helmet titleTemplate="%s - Training Report | TTA Hub" defaultTitle="Session - Training Report | TTA Hub" />
      <BackLink to="/training-reports/in-progress">
        Back to Training Reports
      </BackLink>
      <Grid row className="flex-justify">
        <Grid col="auto">
          <div className="margin-top-3 margin-bottom-5">
            <h1 className="font-serif-2xl text-bold line-height-serif-2 margin-0">
              Training report - Session
            </h1>
          </div>
        </Grid>
      </Grid>
      <NetworkContext.Provider value={{ connectionActive: isOnlineMode() }}>
        {/* eslint-disable-next-line react/jsx-props-no-spreading */}
        <FormProvider {...hookForm}>
          <Navigator
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
            additionalData={{}}
            formData={formData}
            pages={pages}
            onFormSubmit={onFormSubmit}
            onSave={onSave}
            onResetToDraft={() => {}}
            isApprover={false}
            isPendingApprover={false}
            onReview={() => {}}
            errorMessage={errorMessage}
            updateErrorMessage={updateErrorMessage}
            savedToStorageTime={savedToStorageTime}
            onSaveDraft={onSave}
            onSaveAndContinue={onSaveAndContinue}
            showSavedDraft={showSavedDraft}
            updateShowSavedDraft={updateShowSavedDraft}
            formDataStatusProp="status"
          />
        </FormProvider>
      </NetworkContext.Provider>
    </div>
  );
}

SessionForm.propTypes = {
  match: ReactRouterPropTypes.match.isRequired,
};
