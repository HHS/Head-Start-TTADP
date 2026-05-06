import { Alert, Grid } from '@trussworks/react-uswds';
import moment from 'moment';
import PropTypes from 'prop-types';
import React, { useContext, useRef, useState } from 'react';
import { Helmet } from 'react-helmet';
import { FormProvider, useForm } from 'react-hook-form';
import { Redirect } from 'react-router-dom';
import ReactRouterPropTypes from 'react-router-prop-types';
import AppLoadingContext from '../../../../AppLoadingContext';
import BackLink from '../../../../components/BackLink';
import { LogProvider } from '../../../../components/CommunicationLog/components/LogContext';
import LogFormNavigator from '../../../../components/CommunicationLog/components/LogFormNavigator';
import {
  defaultValues,
  formatRecipientCommunicationLogUrl,
  GENERIC_SAVE_ERROR,
  isCommunicationLogNotFoundError,
  LOG_NOT_FOUND_SAVE_ERROR,
  recipientRecordRootUrl,
  resetFormData,
} from '../../../../components/CommunicationLog/constants';
import {
  createCommunicationLogByRecipientId,
  updateCommunicationLogById,
} from '../../../../fetchers/communicationLog';
import NetworkContext, { isOnlineMode } from '../../../../NetworkContext';
import UserContext from '../../../../UserContext';
import { shouldUpdateFormData } from '../../../../utils/formRichTextEditorHelper';
import pages from './pages';

const shouldFetch = ({
  communicationLogId,
  regionId,
  recipientId,
  reportFetched,
  isAppLoading,
  currentPage,
}) => {
  if (
    !currentPage || // we
    !communicationLogId || // need
    !regionId || // all
    !recipientId || // of
    communicationLogId === 'new' || // these
    reportFetched || // conditions
    isAppLoading
  ) {
    // to
    return false; // be
  } // met
  return true; // to
}; // fetch

export default function CommunicationLogForm({ match, recipientName }) {
  const {
    params: { recipientId, regionId, currentPage, communicationLogId },
  } = match;

  const reportId = useRef(communicationLogId);
  const { user } = useContext(UserContext);

  /* ============ */

  const [error, setError] = useState();
  const [lastSaveTime, updateLastSaveTime] = useState(null);
  const [showSavedDraft, updateShowSavedDraft] = useState(false);

  /* ============
   */

  const hookForm = useForm({
    mode: 'onBlur',
    defaultValues: {
      ...defaultValues,
      userId: user.id,
      regionId,
    },
    shouldUnregister: false,
  });

  const { setIsAppLoading } = useContext(AppLoadingContext);
  const [reportFetched, setReportFetched] = useState(false);

  const onSave = async (isAutoSave = false) => {
    try {
      setError(null);
      setIsAppLoading(true);
      hookForm.clearErrors();

      // grab the newest data from the form
      const data = hookForm.getValues();

      let loggedCommunication;

      // check to see if report ID is "new"
      if (reportId.current === 'new') {
        loggedCommunication = await createCommunicationLogByRecipientId(
          regionId,
          recipientId,
          data
        );
        reportId.current = loggedCommunication.id;
      } else if (reportId.current) {
        // PUT it to the backend
        loggedCommunication = await updateCommunicationLogById(reportId.current, data);
      }

      // update the form data
      // Check if we should update form data
      // (prevents focus loss in rich text editors during autosave)
      const allowUpdateForm = shouldUpdateFormData(isAutoSave);
      if (allowUpdateForm) {
        resetFormData(hookForm.reset, loggedCommunication);
      }

      // update the last save time
      updateLastSaveTime(moment(loggedCommunication.updatedAt));

      // update the sidebar message
      updateShowSavedDraft(true);
    } catch (err) {
      const isMissingLog = isCommunicationLogNotFoundError(err);
      setError(isMissingLog ? LOG_NOT_FOUND_SAVE_ERROR : GENERIC_SAVE_ERROR);
    } finally {
      setReportFetched(true);
      setIsAppLoading(false);
    }
  };

  if (!currentPage) {
    return (
      <Redirect
        to={formatRecipientCommunicationLogUrl(recipientId, regionId, reportId.current, 'log')}
      />
    );
  }

  return (
    <div className="smart-hub-communication-log--form padding-top-3 maxw-widescreen">
      {error && <Alert type="warning">{error}</Alert>}
      <Helmet
        titleTemplate="%s - New Communication | TTA Hub"
        defaultTitle="Communication Log - New Communication | TTA Hub"
      />
      <BackLink to={`${recipientRecordRootUrl(recipientId, regionId)}/communication`}>
        Back to Communication Log
      </BackLink>
      <Grid row className="flex-justify">
        <Grid col="auto">
          <div className="margin-top-3 margin-bottom-5">
            <h1 className="font-serif-2xl text-bold line-height-serif-2 margin-0">
              {recipientName}
            </h1>
          </div>
        </Grid>
      </Grid>
      <NetworkContext.Provider value={{ connectionActive: isOnlineMode() }}>
        {/* eslint-disable-next-line react/jsx-props-no-spreading */}
        <FormProvider {...hookForm}>
          <LogProvider regionId={regionId}>
            <LogFormNavigator
              shouldFetch={shouldFetch}
              reportFetched={reportFetched}
              setReportFetched={setReportFetched}
              pages={pages}
              currentPage={currentPage}
              regionId={regionId}
              onSave={onSave}
              redirectPathOnSave={() =>
                formatRecipientCommunicationLogUrl(recipientId, regionId, reportId.current)
              }
              redirectToOnSubmit={`${recipientRecordRootUrl(recipientId, regionId)}/communication`}
              lastSaveTime={lastSaveTime}
              updateLastSaveTime={updateLastSaveTime}
              showSavedDraft={showSavedDraft}
              updateShowSavedDraft={updateShowSavedDraft}
              reportId={reportId}
              recipientId={recipientId}
              setError={setError}
            />
          </LogProvider>
        </FormProvider>
      </NetworkContext.Provider>
    </div>
  );
}

CommunicationLogForm.propTypes = {
  match: ReactRouterPropTypes.match.isRequired,
  recipientName: PropTypes.string.isRequired,
};
