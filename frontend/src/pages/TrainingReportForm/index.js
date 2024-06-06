import React, {
  useEffect,
  useState,
  useContext,
  useRef,
} from 'react';
import moment from 'moment';
import { Helmet } from 'react-helmet';
import { Alert, Grid } from '@trussworks/react-uswds';
import { useNavigate, Navigate, useParams } from 'react-router-dom';
import { FormProvider, useForm } from 'react-hook-form';
import useSocket, { usePublishWebsocketLocationOnInterval } from '../../hooks/useSocket';
import useLocalStorage from '../../hooks/useLocalStorage';
import {
  LOCAL_STORAGE_ADDITIONAL_DATA_KEY,
  defaultValues,
} from './constants';
import { getTrainingReportUsers } from '../../fetchers/users';
import { eventById, updateEvent } from '../../fetchers/event';
import NetworkContext, { isOnlineMode } from '../../NetworkContext';
import UserContext from '../../UserContext';
import Navigator from '../../components/Navigator';
import BackLink from '../../components/BackLink';
import pages from './pages';
import AppLoadingContext from '../../AppLoadingContext';
import useHookFormPageState from '../../hooks/useHookFormPageState';

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
const resetFormData = (reset, event) => {
  const {
    data,
    updatedAt,
    ...fields
  } = event;

  const form = {
    ...data,
    ...fields,
  };

  if (!form.pocIds && form.pocIds !== undefined) {
    form.pocIds = [];
  }

  reset({
    ...defaultValues,
    ...form,
  });
};

export default function TrainingReportForm() {
  const { currentPage, trainingReportId } = useParams();

  const reportId = useRef();

  // for redirects if a page is not provided
  const navigate = useNavigate();

  /* ============

   * the following errors are a bit confusingly named, but
   * I'm copying the pattern from the ActivityReport
   */

  // this error is for errors fetching reports, its the top error
  const [error, setError] = useState();

  // this is the error that appears in the sidebar
  const [errorMessage, updateErrorMessage] = useState();

  /* ============ */

  // this attempts to track whether or not we're online
  // (or at least, if the backend is responding)
  const [connectionActive] = useState(true);

  const [lastSaveTime, updateLastSaveTime] = useState(null);
  const [showSavedDraft, updateShowSavedDraft] = useState(false);

  /* ============
   * this hook handles the interface with
   * local storage
   */

  const [additionalData, updateAdditionalData, localStorageAvailable] = useLocalStorage(
    LOCAL_STORAGE_ADDITIONAL_DATA_KEY(trainingReportId), {
      users: {
        pointOfContact: [],
        collaborators: [],
      },
    },
  );

  // we use both of these to determine if we're in the loading screen state
  // (see the use effect below)
  const [reportFetched, setReportFetched] = useState(false);
  const [additionalDataFetched, setAdditionalDataFetched] = useState(false);

  // this holds the key for the date pickers to force re-render
  // as the truss component doesn't re-render when the default value changes
  const [datePickerKey, setDatePickerKey] = useState(Date.now().toString());

  /* ============
  */

  const hookForm = useForm({
    mode: 'onBlur',
    defaultValues,
    shouldUnregister: false,
  });

  const eventRegion = hookForm.watch('regionId');
  const formData = hookForm.getValues();

  const { user } = useContext(UserContext);
  const { setIsAppLoading, isAppLoading } = useContext(AppLoadingContext);

  const {
    socket,
    setSocketPath,
    socketPath,
    messageStore,
  } = useSocket(user);

  useEffect(() => {
    if (!trainingReportId) {
      return;
    }
    const newPath = `/training-reports/${trainingReportId}`;
    setSocketPath(newPath);
  }, [currentPage, setSocketPath, trainingReportId]);

  usePublishWebsocketLocationOnInterval(socket, socketPath, user, lastSaveTime, INTERVAL_DELAY);

  useEffect(() => {
    const loading = !reportFetched || !additionalDataFetched;
    setIsAppLoading(loading);
  }, [additionalDataFetched, reportFetched, setIsAppLoading]);

  useEffect(() => {
    // fetch available users
    async function fetchUsers() {
      if (!eventRegion || additionalDataFetched) {
        return;
      }

      try {
        const users = await getTrainingReportUsers(eventRegion, trainingReportId);
        updateAdditionalData({ users });
      } catch (e) {
        updateErrorMessage('Error fetching collaborators and points of contact');
      } finally {
        setAdditionalDataFetched(true);
      }
    }

    fetchUsers();
  }, [additionalDataFetched, eventRegion, isAppLoading, updateAdditionalData, trainingReportId]);

  useEffect(() => {
    // fetch event report data
    async function fetchReport() {
      if (!trainingReportId || !currentPage || reportFetched) {
        return;
      }
      try {
        const event = await eventById(trainingReportId);
        resetFormData(hookForm.reset, event);
        reportId.current = trainingReportId;
      } catch (e) {
        setError('Error fetching training report');
      } finally {
        setReportFetched(true);
        setDatePickerKey(Date.now().toString());
      }
    }
    fetchReport();
  }, [currentPage, hookForm.reset, isAppLoading, reportFetched, trainingReportId]);

  useEffect(() => {
    // set error if no training report id
    if (!trainingReportId) {
      setError('No training report id provided');
    }
  }, [trainingReportId]);

  // hook to update the page state in the sidebar
  useHookFormPageState(hookForm, pages, currentPage);

  const updatePage = (position) => {
    const state = {};
    if (reportId.current) {
      state.showLastUpdatedTime = true;
    }

    const page = pages.find((p) => p.position === position);
    const newPath = `/training-report/${reportId.current}/${page.path}`;
    navigate(newPath, { state });
  };

  if (!currentPage) {
    return (
      <Navigate to={`/training-report/${trainingReportId}/event-summary`} />
    );
  }

  const onSave = async (updatedStatus = null) => {
    // if the event is complete, don't allow saving it
    if (updatedStatus === 'Complete') {
      hookForm.setError('status', { message: 'To complete event, submit it' });
      return;
    }

    try {
      // reset the error message
      setError('');
      setIsAppLoading(true);
      hookForm.clearErrors();

      // grab the newest data from the form
      const {
        ownerId,
        pocIds,
        collaboratorIds,
        regionId,
        sessionReports,
        ...data
      } = hookForm.getValues();

      const dataToPut = {
        data: {
          ...data,
        },
        ownerId: ownerId || null,
        pocIds: pocIds || null,
        collaboratorIds,
        regionId: regionId || null,
      };

      // autosave sends us a "true" boolean so we don't want to update the status
      // if that is the case
      if (updatedStatus && typeof updatedStatus === 'string') {
        dataToPut.data.status = updatedStatus;
      }

      // PUT it to the backend
      const updatedEvent = await updateEvent(trainingReportId, dataToPut);
      resetFormData(hookForm.reset, updatedEvent);
      updateLastSaveTime(moment(updatedEvent.updatedAt));
      updateShowSavedDraft(true);
    } catch (err) {
      setError('There was an error saving the training report. Please try again later.');
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
      // reset the error message
      setError('');
      setIsAppLoading(true);

      // grab the newest data from the form
      const {
        ownerId,
        pocIds,
        collaboratorIds,
        regionId,
        ...data
      } = hookForm.getValues();

      // PUT it to the backend
      const updatedEvent = await updateEvent(trainingReportId, {
        data: {
          ...data,
          status: updatedStatus,
        },
        ownerId: ownerId || null,
        pocIds: pocIds || null,
        collaboratorIds,
        regionId: regionId || null,
      });
      resetFormData(hookForm.reset, updatedEvent);

      updateLastSaveTime(moment(updatedEvent.updatedAt));
      navigate('/training-reports/complete', { message: 'You successfully submitted the event.' });
    } catch (err) {
      setError('There was an error saving the training report. Please try again later.');
    } finally {
      setIsAppLoading(false);
    }
  };

  const reportCreator = { name: user.name, roles: user.roles };

  // retrieve the last time the data was saved to local storage
  const savedToStorageTime = formData ? formData.savedToStorageTime : null;

  const backLinkUrl = (() => {
    if (!formData || !formData.status) {
      return '/training-reports/not-started';
    }

    return `/training-reports/${formData.status.replace(' ', '-').toLowerCase()}`;
  })();

  return (
    <div className="smart-hub-training-report">
      { error
      && (
      <Alert className="margin-bottom-3" type="warning">
        {error}
      </Alert>
      )}
      <Helmet titleTemplate="%s - Training Report | TTA Hub" defaultTitle="Event - Training Report | TTA Hub" />
      <BackLink to={backLinkUrl}>
        Back to Training Reports
      </BackLink>
      <Grid row className="flex-justify">
        <Grid col="auto">
          <div className="margin-top-3 margin-bottom-5">
            <h1 className="font-serif-2xl text-bold line-height-serif-2 margin-0">
              Training report - Event
            </h1>
          </div>
        </Grid>
      </Grid>
      <NetworkContext.Provider value={
        {
          connectionActive: isOnlineMode() && connectionActive,
          localStorageAvailable,
        }
      }
      >
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
            additionalData={additionalData}
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
