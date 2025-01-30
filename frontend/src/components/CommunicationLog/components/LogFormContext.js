/* eslint-disable max-len */
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from 'react';
import PropTypes from 'prop-types';
import { useForm } from 'react-hook-form';
import { useHistory } from 'react-router-dom';
import { getCommunicationLogById, updateCommunicationLogById } from '../../../fetchers/communicationLog';
import { defaultValues, formatRegionalCommunicationLogUrl, resetFormData } from '../constants';
import useHookFormPageState from '../../../hooks/useHookFormPageState';
import AppLoadingContext from '../../../AppLoadingContext';
import UserContext from '../../../UserContext';
import { ROUTES } from '../../../Constants';

const LogFormContext = createContext();

const LogFormProvider = ({
  children,
  shouldFetch,
  logId,
  pages,
  currentPage,
  regionId,
  onSave,
  redirectToOnSubmit,
}) => {
  const reportId = useRef(logId);

  // for redirects if a page is not provided
  const history = useHistory();

  // this is the error that appears in the sidebar
  const [errorMessage, updateErrorMessage] = useState();

  const { user } = useContext(UserContext);

  /* ============ */

  const [lastSaveTime, updateLastSaveTime] = useState(null);
  const [showSavedDraft, updateShowSavedDraft] = useState(false);

  // this holds the key for the date pickers to force re-render
  // as the truss component doesn't re-render when the default value changes
  const [datePickerKey, setDatePickerKey] = useState(`i${Date.now().toString()}`);

  /* ============ */

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
        history.push(`${ROUTES.SOMETHING_WENT_WRONG}/${e.status}`);
      } finally {
        setDatePickerKey(`f${Date.now().toString()}`);
        setReportFetched(true);
        setIsAppLoading(false);
      }
    }
    fetchLog();
  }, [reportId, hookForm.reset, regionId, reportFetched, isAppLoading, setIsAppLoading, currentPage, history, shouldFetch]);

  // hook to update the page state in the sidebar
  useHookFormPageState(hookForm, pages, currentPage);

  const reportCreator = useMemo(() => ({ name: user.name, roles: user.roles }), [user]);

  // retrieve the last time the data was saved to local storage
  const savedToStorageTime = useMemo(() => (formData ? formData.savedToStorageTime : null), [formData]);

  const updatePage = useCallback(() => (position) => {
    const state = {};
    if (reportId.current) {
      state.showLastUpdatedTime = true;
    }

    const page = pages.find((p) => p.position === position);
    const newPath = `${formatRegionalCommunicationLogUrl(regionId, reportId.current)}${page.path}`;
    history.push(newPath, state);
  }, [history, pages, regionId]);

  const onSaveAndContinue = useCallback(() => async () => {
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
  }, [currentPage, hookForm, onSave, pages, updatePage]);

  const preFlight = useCallback(() => async () => {
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
  }, [currentPage, hookForm, pages]);

  const onFormSubmit = useCallback(() => async () => {
    try {
      const allPagesComplete = pages.every((page) => page.isPageComplete(hookForm));

      if (!allPagesComplete) {
        return;
      }

      // reset the error message
      // setError('');
      setIsAppLoading(true);

      // grab the newest data from the form
      const data = hookForm.getValues();

      // PUT it to the backend
      await updateCommunicationLogById(
        reportId.current,
        data,
      );

      history.push(
        redirectToOnSubmit,
        { message: 'You successfully saved the communication log.' },
      );
    } catch (err) {
      // setError('There was an error saving the communication log. Please try again later.');
    } finally {
      setIsAppLoading(false);
    }
  }, [history, hookForm, pages, redirectToOnSubmit, setIsAppLoading]);

  return (
    <LogFormContext.Provider value={{
      hookForm,
      reportCreator,
      lastSaveTime,
      updateLastSaveTime,
      showSavedDraft,
      updateErrorMessage,
      errorMessage,
      savedToStorageTime,
      datePickerKey,
      onSaveAndContinue,
      preFlight,
      onFormSubmit,
    }}
    >
      {children}
    </LogFormContext.Provider>
  );
};

LogFormProvider.propTypes = {
  children: PropTypes.node.isRequired,
  shouldFetch: PropTypes.func.isRequired,
  logId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  pages: PropTypes.arrayOf(PropTypes.shape({
    position: PropTypes.number.isRequired,
    label: PropTypes.string.isRequired,
  })).isRequired,
  currentPage: PropTypes.string.isRequired,
  regionId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  onSave: PropTypes.func.isRequired,
  redirectToOnSubmit: PropTypes.string.isRequired,
};

const useLogFormContext = () => {
  if (!LogFormContext) {
    throw new Error('useLogFormContext must be used within a LogFormContext');
  }

  return useContext(LogFormContext);
};

export { LogFormContext, useLogFormContext, LogFormProvider };
