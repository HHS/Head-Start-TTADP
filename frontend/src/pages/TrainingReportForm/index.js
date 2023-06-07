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
import useInterval from '@use-it/interval';
import { FormProvider, useForm } from 'react-hook-form';
import useSocket, { publishLocation } from '../../hooks/useSocket';
import useLocalStorage from '../../hooks/useLocalStorage';
import {
  LOCAL_STORAGE_ADDITIONAL_DATA_KEY,
  defaultValues,
} from './constants';
import { IN_PROGRESS, COMPLETE, NOT_STARTED } from '../../components/Navigator/constants';
import { getTrainingReportUsers } from '../../fetchers/users';
import { eventById, updateEvent } from '../../fetchers/event';
import NetworkContext, { isOnlineMode } from '../../NetworkContext';
import UserContext from '../../UserContext';
import Navigator from '../../components/Navigator';
import pages from './pages';
import AppLoadingContext from '../../AppLoadingContext';

// websocket publish location interval
const INTERVAL_DELAY = 30000; // THIRTY SECONDS

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

  reset({
    ...defaultValues,
    ...form,
  });
};

export default function TrainingReportForm({ match }) {
  const { params: { currentPage, trainingReportId } } = match;
  const reportId = useRef();

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
  const [datePickerKey, setDatePickerKey] = useState('-');

  /* ============
  */

  const hookForm = useForm({
    mode: 'onBlur',
    defaultValues,
    shouldUnregister: false,
  });

  const eventRegion = hookForm.watch('regionId');
  const pageState = hookForm.watch('pageState');
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
    if (!trainingReportId || !currentPage) {
      return;
    }
    const newPath = `/training-reports/${trainingReportId}/${currentPage}`;
    setSocketPath(newPath);
  }, [currentPage, setSocketPath, trainingReportId]);

  useInterval(() => publishLocation(socket, socketPath, user, lastSaveTime), INTERVAL_DELAY);

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
        const users = await getTrainingReportUsers(eventRegion);
        updateAdditionalData({ users });
      } catch (e) {
        updateErrorMessage('Error fetching collaborators and points of contact');
      } finally {
        setAdditionalDataFetched(true);
      }
    }

    fetchUsers();
  }, [additionalDataFetched, eventRegion, isAppLoading, updateAdditionalData]);

  useEffect(() => {
    // fetch event report data
    async function fetchReport() {
      if (!trainingReportId || reportFetched) {
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
  }, [hookForm.reset, isAppLoading, reportFetched, trainingReportId]);

  useEffect(() => {
    // set error if no training report id
    if (!trainingReportId) {
      setError('No training report id provided');
    }
  }, [trainingReportId]);

  const whereWeAre = pages.find((p) => p.path === currentPage);

  const updatePage = (position) => {
    const state = {};
    if (reportId.current) {
      state.showLastUpdatedTime = true;
    }

    const page = pages.find((p) => p.position === position);
    const newPath = `/training-report/${reportId.current}/${page.path}`;
    history.push(newPath, state);
  };

  if (!currentPage) {
    return (
      <Redirect push to={`/training-report/${trainingReportId}/event-summary`} />
    );
  }

  const newNavigatorState = () => pages.reduce((newState, page) => {
    if (page.review) {
      return pageState;
    }

    const isComplete = page.isPageComplete(hookForm);
    const isTouched = page.isPageTouched(hookForm);
    const newPageState = { ...newState };

    if (isComplete) {
      newPageState[page.position] = COMPLETE;
    } else if (whereWeAre.position === page.position || isTouched) {
      newPageState[page.position] = IN_PROGRESS;
    } else {
      newPageState[page.position] = NOT_STARTED;
    }

    return newPageState;
  }, { ...pageState });

  const onSave = async () => {
    try {
      // reset the error message
      setError('');
      setIsAppLoading(true);

      await hookForm.trigger();

      // grab the newest data from the form
      const {
        ownerId,
        pocId,
        collaboratorIds,
        regionId,
        ...data
      } = hookForm.getValues();

      // PUT it to the backend
      const updatedEvent = await updateEvent(trainingReportId, {
        data: {
          ...data,
          pageState: newNavigatorState(),
        },
        ownerId: ownerId || null,
        pocId: pocId || null,
        collaboratorIds,
        regionId: regionId || null,
      });
      resetFormData(hookForm.reset, updatedEvent);
      updateLastSaveTime(moment(updatedEvent.updatedAt));
    } catch (err) {
      setError('There was an error saving the training report. Please try again later.');
    } finally {
      setIsAppLoading(false);
    }
  };

  const onSaveAndContinue = async () => {
    const { fields } = whereWeAre;
    await hookForm.trigger(fields, { shouldFocus: true });

    const hasErrors = Object.keys(hookForm.formState.errors).length > 0;
    if (hasErrors) {
      const invalid = document.querySelector('.usa-form-group--error');
      if (invalid) {
        const input = invalid.querySelector('input, select, textarea');
        if (input) input.focus();
      }

      // debugger;

      return;
    }

    await onSave();
  };

  const onFormSubmit = async () => {
    // logic forthcoming
  };

  const reportCreator = { name: user.name, roles: user.roles };

  // retrieve the last time the data was saved to local storage
  const savedToStorageTime = formData ? formData.savedToStorageTime : null;

  return (
    <div className="smart-hub-training-report">
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
              Regional/National Training Report
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
          />
        </FormProvider>
      </NetworkContext.Provider>
    </div>
  );
}

TrainingReportForm.propTypes = {
  match: ReactRouterPropTypes.match.isRequired,
};
