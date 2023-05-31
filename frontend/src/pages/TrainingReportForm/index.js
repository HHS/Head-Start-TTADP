import React, {
  useEffect,
  useState,
  useContext,
  useRef,
} from 'react';
import ReactRouterPropTypes from 'react-router-prop-types';
import { Helmet } from 'react-helmet';
import { Alert, Grid } from '@trussworks/react-uswds';
import { useHistory, Redirect } from 'react-router-dom';
import useInterval from '@use-it/interval';
import { startCase } from 'lodash';
import { FormProvider, useForm } from 'react-hook-form';
import useSocket, { publishLocation } from '../../hooks/useSocket';
import useLocalStorage from '../../hooks/useLocalStorage';
import useARLocalStorage from '../../hooks/useARLocalStorage';
import {
  LOCAL_STORAGE_DATA_KEY,
  LOCAL_STORAGE_ADDITIONAL_DATA_KEY,
  LOCAL_STORAGE_EDITABLE_KEY,
  defaultValues,
} from './constants';
import NetworkContext, { isOnlineMode } from '../../NetworkContext';
import UserContext from '../../UserContext';
import Navigator from '../../components/Navigator';
import pages from './pages';

const INTERVAL_DELAY = 30000; // THIRTY SECONDS

export default function TrainingReportForm({ match }) {
  const { params: { currentPage, trainingReportId } } = match;
  const reportId = useRef();

  const history = useHistory();

  /* ============

   * the following errors are a bit confusingly named, but
   * I'm copying the pattern from the ActivityReport
   */

  // this error is for errors fetching reports, its the top error
  const [error] = useState();

  // this is the error that appears in the sidebar
  const [errorMessage, updateErrorMessage] = useState();

  /* ============ */

  // this attempts to track whether or not we're online
  // (or at least, if the backend is responding)
  const [connectionActive] = useState(true);

  const [lastSaveTime, updateLastSaveTime] = useState(null);
  const [showSavedDraft, updateShowSavedDraft] = useState(false);

  /* ============
   * these are the hooks that handle the interface with
   * local storage
   */

  const [formData, updateFormData, localStorageAvailable] = useARLocalStorage(
    LOCAL_STORAGE_DATA_KEY(trainingReportId), defaultValues,
  );
  const [initialAdditionalData] = useLocalStorage(
    LOCAL_STORAGE_ADDITIONAL_DATA_KEY(trainingReportId), {
      recipients: {
        grants: [],
        otherEntities: [],
      },
      collaborators: [],
      availableApprovers: [],
    },
  );

  const [editable] = useLocalStorage(
    LOCAL_STORAGE_EDITABLE_KEY(trainingReportId), (trainingReportId === 'new'), currentPage !== 'review',
  );

  /* ============
  */

  const hookForm = useForm({
    mode: 'onBlur',
    defaultValues: formData,
    shouldUnregister: false,
  });

  const { user } = useContext(UserContext);

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
    const newPath = `/training-repors/${trainingReportId}/${currentPage}`;
    setSocketPath(newPath);
  }, [currentPage, setSocketPath, trainingReportId]);

  useInterval(() => publishLocation(socket, socketPath, user, lastSaveTime), INTERVAL_DELAY);

  useEffect(() => {
    // fetch data if trainingReportId is not "new"

  }, []);

  const updatePage = (position) => {
    if (!editable) {
      return;
    }

    const state = {};
    if (trainingReportId === 'new' && reportId.current !== 'new') {
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

  const onSaveDraft = async (data) => {
    console.log('onSaveDraft', data);
  };
  const onSaveAndContinue = async (data) => {
    console.log('onSaveAndContinue', data);
  };

  const onSave = async (data) => {
    console.log('onSave', data);
  };

  const onFormSubmit = async (data) => {
    console.log('onFormSubmit', data);
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
