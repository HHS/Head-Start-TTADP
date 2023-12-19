import React, {
  useEffect,
  useState,
  useContext,
  useRef,
} from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import ReactRouterPropTypes from 'react-router-prop-types';
import { Helmet } from 'react-helmet';
import { Alert, Grid } from '@trussworks/react-uswds';
import { useHistory, Redirect } from 'react-router-dom';
import { FormProvider, useForm } from 'react-hook-form';
import useHookFormPageState from '../../../../hooks/useHookFormPageState';
import { defaultValues, formatCommunicationLogUrl, recipientRecordRootUrl } from './constants';
import NetworkContext, { isOnlineMode } from '../../../../NetworkContext';
import UserContext from '../../../../UserContext';
import Navigator from '../../../../components/Navigator';
import BackLink from '../../../../components/BackLink';
import pages from './pages';
import AppLoadingContext from '../../../../AppLoadingContext';
import {
  updateCommunicationLogById,
  createCommunicationLogByRecipientId,
  getCommunicationLogById,
} from '../../../../fetchers/communicationLog';

/**
 * this is just a simple handler to "flatten"
 * the JSON column data into the form
 *
 * @param {fn} reset this is the hookForm.reset function (pass it a new set of values and it
 *  replaces the form with those values; it also calls the standard form.reset event
 * @param {*} event - not an HTML event, but the event object from the database, which has some
 * information stored at the top level of the object, and some stored in a data column
 */
const resetFormData = (reset, updatedLog) => {
  const {
    data,
    updatedAt,
    ...fields
  } = updatedLog;

  const form = {
    ...defaultValues,
    ...data,
    ...fields,
  };

  reset(form);
};

const shouldFetch = (
  communicationLogId,
  regionId,
  recipientId,
  reportFetched,
  isAppLoading,
  currentPage,
) => {
  if (
    !currentPage // we
    || !communicationLogId // need
    || !regionId // all
    || !recipientId // of
    || communicationLogId === 'new' // these
    || reportFetched // conditions
    || isAppLoading) { // to
    return false; // be
  } // met
  return true; // to
}; // fetch

export default function CommunicationLogForm({ match, recipientName }) {
  const {
    params: {
      recipientId,
      regionId,
      currentPage,
      communicationLogId,
    },
  } = match;

  const reportId = useRef(communicationLogId);

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

  const { user } = useContext(UserContext);

  /* ============ */

  const [lastSaveTime, updateLastSaveTime] = useState(null);
  const [showSavedDraft, updateShowSavedDraft] = useState(false);

  // this holds the key for the date pickers to force re-render
  // as the truss component doesn't re-render when the default value changes
  const [datePickerKey, setDatePickerKey] = useState(`i${Date.now().toString()}`);

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

  const formData = hookForm.getValues();

  const { isAppLoading, setIsAppLoading } = useContext(AppLoadingContext);
  const [reportFetched, setReportFetched] = useState(false);

  useEffect(() => {
    // fetch communication log data
    async function fetchLog() {
      if (!shouldFetch(
        reportId.current,
        regionId,
        recipientId,
        reportFetched,
        isAppLoading,
        currentPage,
      )) {
        return;
      }

      try {
        setIsAppLoading(true);
        const log = await getCommunicationLogById(regionId, reportId.current);
        resetFormData(hookForm.reset, log);
      } catch (e) {
        setError('Error fetching communication log');
      } finally {
        setDatePickerKey(`f${Date.now().toString()}`);
        setReportFetched(true);
        setIsAppLoading(false);
      }
    }
    fetchLog();
  }, [
    reportId,
    hookForm.reset,
    recipientId,
    regionId,
    reportFetched,
    isAppLoading,
    setIsAppLoading,
    currentPage,
  ]);

  // hook to update the page state in the sidebar
  useHookFormPageState(hookForm, pages, currentPage);

  const updatePage = (position) => {
    const state = {};
    if (reportId.current) {
      state.showLastUpdatedTime = true;
    }

    const page = pages.find((p) => p.position === position);
    const newPath = `${formatCommunicationLogUrl(recipientId, regionId, reportId.current)}${page.path}`;
    history.push(newPath, state);
  };

  if (!currentPage) {
    return (
      <Redirect to={formatCommunicationLogUrl(recipientId, regionId, reportId.current, 'log')} />
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

      let loggedCommunication;
      // check to see if report ID is "new"
      if (reportId.current === 'new') {
        loggedCommunication = await createCommunicationLogByRecipientId(
          regionId,
          recipientId,
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
      updateLastSaveTime(moment(loggedCommunication.updatedAt));

      // update the sidebar message
      updateShowSavedDraft(true);
    } catch (err) {
      setError('There was an error saving the communication log. Please try again later.');
    } finally {
      setReportFetched(true);
      setIsAppLoading(false);
    }
  };

  const onSaveAndContinue = async () => {
    const valid = await hookForm.trigger();
    if (!valid) {
      return;
    }
    await onSave();
    updateShowSavedDraft(false);
    const whereWeAre = pages.find((p) => p.path === currentPage);
    const nextPage = pages.find((p) => p.position === whereWeAre.position + 1);
    if (nextPage) {
      updatePage(nextPage.position);
    }
  };

  const preFlight = async () => {
    /**
     * if we're on the first page of the form (log)
     * we need to trigger the validation for the date
     * since we don't want to save the form if the date
     * is invalid
     */
    const whereWeAre = pages.find((p) => p.path === currentPage);
    if (whereWeAre.position === 1) {
      return hookForm.trigger('communicationDate');
    }
    return true;
  };

  const onFormSubmit = async () => {
    try {
      const allPagesComplete = pages.every((page) => page.isPageComplete(hookForm));

      if (!allPagesComplete) {
        return;
      }

      // reset the error message
      setError('');
      setIsAppLoading(true);

      // grab the newest data from the form
      const data = hookForm.getValues();

      // PUT it to the backend
      await updateCommunicationLogById(
        reportId.current,
        data,
      );

      history.push(
        `${recipientRecordRootUrl(recipientId, regionId)}/communication`,
        { message: 'You successfully saved the communication log.' },
      );
    } catch (err) {
      setError('There was an error saving the communication log. Please try again later.');
    } finally {
      setIsAppLoading(false);
    }
  };

  const reportCreator = { name: user.name, roles: user.roles };

  // retrieve the last time the data was saved to local storage
  const savedToStorageTime = formData ? formData.savedToStorageTime : null;

  return (
    <div className="smart-hub-communication-log--form padding-top-3 maxw-widescreen">
      { error
          && (
          <Alert type="warning">
            {error}
          </Alert>
          )}
      <Helmet titleTemplate="%s - New Communication | TTA Hub" defaultTitle="Communication Log - New Communication | TTA Hub" />
      <BackLink to={`${recipientRecordRootUrl(recipientId, regionId)}/communication`}>
        Back to Communication Log
      </BackLink>
      <Grid row className="flex-justify">
        <Grid col="auto">
          <div className="margin-top-3 margin-bottom-5">
            <h1 className="font-serif-2xl text-bold line-height-serif-2 margin-0">
              { recipientName }
            </h1>
          </div>
        </Grid>
      </Grid>
      <NetworkContext.Provider value={{ connectionActive: isOnlineMode() }}>
        {/* eslint-disable-next-line react/jsx-props-no-spreading */}
        <FormProvider {...hookForm}>
          <Navigator
            shouldAutoSave={communicationLogId !== 'new'}
            datePickerKey={datePickerKey}
            socketMessageStore={{}}
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
            preFlightForNavigation={preFlight}
          />
        </FormProvider>
      </NetworkContext.Provider>
    </div>
  );
}

CommunicationLogForm.propTypes = {
  match: ReactRouterPropTypes.match.isRequired,
  recipientName: PropTypes.string.isRequired,
};
