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
import { startCase } from 'lodash';
import { FormProvider, useForm } from 'react-hook-form';
import useSocket, { publishLocation } from '../../hooks/useSocket';
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
import pages from './pages';
import AppLoadingContext from '../../AppLoadingContext';

const INTERVAL_DELAY = 30000; // THIRTY SECONDS

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
    LOCAL_STORAGE_ADDITIONAL_DATA_KEY(trainingReportId), { users: [] },
  );

  const [reportFetched, setReportFetched] = useState(false);
  const [additionalDataFetched, setAdditionalDataFetched] = useState(false);

  /* ============
  */

  const hookForm = useForm({
    mode: 'onBlur',
    defaultValues,
    shouldUnregister: false,
  });

  const eventRegion = hookForm.watch('eventRegion');
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
    if (trainingReportId === 'new' || !currentPage) {
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

  const onSave = async () => {
    try {
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
        data,
        ownerId: ownerId || null,
        pocId: pocId || null,
        collaboratorIds: collaboratorIds || [],
        regionId: regionId || null,
      });

      resetFormData(hookForm.reset, updatedEvent);
      updateLastSaveTime(moment(updatedEvent.updatedAt));
    } catch (err) {
      setError('There was an error saving the training report. Please try again later.');
    }
  };

  const onSaveDraft = async () => {
    await onSave();
  };
  const onSaveAndContinue = async () => {
    await onSave();
  };

  const onFormSubmit = async () => {
    // logic forthcoming
  };

  const reportCreator = { name: user.name, roles: user.roles };
  const tagClass = formData.status === 'Completed' ? 'smart-hub--tag-approved' : '';

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
        {/* eslint-disable-next-line react/jsx-props-no-spreading */}
        <FormProvider {...hookForm}>
          <Navigator
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
            onSaveDraft={onSaveDraft}
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
