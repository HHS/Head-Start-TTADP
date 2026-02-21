/* eslint-disable max-len */
import React, {
  useContext,
  useRef,
  useState,
} from 'react';
import { Redirect, useParams } from 'react-router';
import { Helmet } from 'react-helmet';
import { Grid, Alert } from '@trussworks/react-uswds';
import { FormProvider, useForm } from 'react-hook-form';
import { defaultValues, formatRegionalCommunicationLogUrl, resetFormData } from '../../components/CommunicationLog/constants';
import NetworkContext, { isOnlineMode } from '../../NetworkContext';
import pages from './pages';
import {
  createRegionalCommunicationLog,
  updateCommunicationLogById,
} from '../../fetchers/communicationLog';
import LogFormNavigator from '../../components/CommunicationLog/components/LogFormNavigator';
import AppLoadingContext from '../../AppLoadingContext';
import UserContext from '../../UserContext';

export const shouldFetch = ({
  communicationLogId,
  regionId,
  reportFetched,
  isAppLoading,
  currentPage,
}) => {
  if (
    !currentPage // we
      || !communicationLogId // need
      || !regionId // all
      || communicationLogId === 'new' // these
      || reportFetched // conditions
      || isAppLoading) { // to
    return false; // be
  } // met
  return true; // to
}; // fetch

export default function RegionalCommunicationLog() {
  const { regionId, logId, currentPage } = useParams();
  const reportId = useRef(logId);
  const { setIsAppLoading } = useContext(AppLoadingContext);
  const { user } = useContext(UserContext);

  const hookForm = useForm({
    mode: 'onBlur',
    defaultValues: {
      ...defaultValues,
      userId: user.id,
      regionId,
    },
    shouldUnregister: false,
  });

  const [error, setError] = useState();
  const [reportFetched, setReportFetched] = useState(false);
  const [lastSaveTime, updateLastSaveTime] = useState(null);
  const [showSavedDraft, updateShowSavedDraft] = useState(false);

  const onSave = async () => {
    try {
      // reset the error message
      setError(null);
      setIsAppLoading(true);
      hookForm.clearErrors();

      // grab the newest data from the form
      const data = hookForm.getValues();

      let loggedCommunication;
      // check to see if report ID is "new"
      if (reportId.current === 'new') {
        loggedCommunication = await createRegionalCommunicationLog(
          regionId,
          data,
        );
        reportId.current = loggedCommunication.id;
      } else if (reportId.current) {
        // PUT it to the backend
        loggedCommunication = await updateCommunicationLogById(reportId.current, data);
      }

      // update the form data
      resetFormData(hookForm.reset, loggedCommunication);

      // update the last save time
      updateLastSaveTime(new Date(loggedCommunication.updatedAt));

      // update the sidebar message
      updateShowSavedDraft(true);
    } catch (err) {
      setError('There was an error saving the communication log. Please try again later.');
    } finally {
      setReportFetched(true);
      setIsAppLoading(false);
    }
  };

  if (!currentPage) {
    return (
      <Redirect to={formatRegionalCommunicationLogUrl(regionId, reportId.current, 'log')} />
    );
  }

  return (
    <div className="smart-hub-communication-log--form maxw-widescreen">
      { error
          && (
          <Alert type="warning">
            {error}
          </Alert>
          )}
      <Helmet titleTemplate="%s - New Communication | TTA Hub" defaultTitle="Communication Log - New Communication | TTA Hub" />
      <Grid row className="flex-justify">
        <Grid col="auto">
          <div className="margin-top-3 margin-bottom-5">
            <h1 className="font-serif-2xl text-bold line-height-serif-2 margin-0">
              Communication log - your region
            </h1>
          </div>
        </Grid>
      </Grid>
      <NetworkContext.Provider value={{ connectionActive: isOnlineMode() }}>
        {/* eslint-disable-next-line react/jsx-props-no-spreading */}
        <FormProvider {...hookForm}>
          <LogFormNavigator
            shouldFetch={shouldFetch}
            reportFetched={reportFetched}
            setReportFetched={setReportFetched}
            pages={pages}
            currentPage={currentPage}
            regionId={regionId}
            onSave={onSave}
            redirectPathOnSave={() => formatRegionalCommunicationLogUrl(regionId, reportId.current)}
            redirectToOnSubmit="/communication-log"
            lastSaveTime={lastSaveTime}
            updateLastSaveTime={updateLastSaveTime}
            showSavedDraft={showSavedDraft}
            updateShowSavedDraft={updateShowSavedDraft}
            reportId={reportId}
            setError={setError}
          />
        </FormProvider>
      </NetworkContext.Provider>
    </div>
  );
}
