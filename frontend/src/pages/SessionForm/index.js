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
  Alert, Grid, Button, ModalToggleButton,
} from '@trussworks/react-uswds';
import { useHistory, Redirect } from 'react-router-dom';
import { FormProvider, useForm } from 'react-hook-form';
import { TRAINING_REPORT_STATUSES, isValidResourceUrl } from '@ttahub/common';
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
import pages from './pages';
import AppLoadingContext from '../../AppLoadingContext';
import SomethingWentWrongContext from '../../SomethingWentWrongContext';
import isAdmin from '../../permissions';
import sessionSummary from './pages/sessionSummary';
import Modal from '../../components/VanillaModal';

// websocket publish location interval
const INTERVAL_DELAY = 10000; // TEN SECONDS

const reduceDataToMatchKeys = (keys, data) => keys.reduce((acc, key) => {
  if (data && Object.prototype.hasOwnProperty.call(data, key)) {
    acc[key] = data[key];
  }
  return acc;
}, {});

const determineKeyArray = (isAdminUser, isPoc) => {
  let keyArray;
  if (isAdminUser) {
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
const resetFormData = (reset, updatedSession, isPocFromSession, isAdminUser) => {
  const keyArray = determineKeyArray(isAdminUser, isPocFromSession);

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
  const modalRef = useRef();

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
  const { setErrorResponseCode } = useContext(SomethingWentWrongContext);

  const {
    socket,
    setSocketPath,
    socketPath,
    messageStore,
  } = useSocket(user);

  const isAdminUser = isAdmin(user);

  const {
    isPoc,
    isCollaborator,
    isOwner,
  } = (() => {
    let isPocUser = false;
    let isCollaboratorUser = false;
    let isOwnerUser = false;
    if (formData && formData.event) {
      if ((formData.event.pocIds && formData.event.pocIds.includes(user.id))) {
        isPocUser = true;
      }

      if (formData.event.collaboratorIds && formData.event.collaboratorIds.includes(user.id)) {
        isCollaboratorUser = true;
      }

      if (formData.event.ownerId && formData.event.ownerId === user.id) {
        isOwnerUser = true;
      }
    }
    return {
      isPoc: isPocUser,
      isCollaborator: isCollaboratorUser,
      isOwner: isOwnerUser,
    };
  })();

  // Set pages based on user role.
  let applicationPages = [];
  if (isAdminUser) {
    applicationPages = [pages.sessionSummary,
      pages.participants,
      pages.supportingAttachments,
      pages.nextSteps];
  } else if (isPoc) {
    applicationPages = [pages.participants, pages.supportingAttachments, pages.nextSteps];
  } else {
    applicationPages = [sessionSummary];
  }
  const redirectPagePath = isPoc && !isAdminUser ? 'participants' : 'session-summary';

  useEffect(() => {
    if (!trainingReportId || !sessionId || !currentPage) {
      return;
    }
    const newPath = `/training-report/${trainingReportId}/session/${sessionId}/${currentPage}`;
    setSocketPath(newPath);
  }, [sessionId, setSocketPath, trainingReportId, currentPage]);

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
        const isPocFromSession = session.event.pocIds.includes(user.id) && !isAdminUser;

        // we don't want to refetch if we've extracted the session data
        setReportFetched(true);
        resetFormData(hookForm.reset, session, isPocFromSession, isAdminUser);
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
        const isPocFromSession = (session.event.pocIds || []).includes(user.id) && !isAdminUser;
        resetFormData(hookForm.reset, session, isPocFromSession, isAdminUser);
        reportId.current = session.id;
      } catch (e) {
        setErrorResponseCode(e.status);
      } finally {
        setReportFetched(true);
        setDatePickerKey(`f${Date.now().toString()}`);
      }
    }
    fetchSession();
  }, [currentPage, hookForm.reset, reportFetched, sessionId, setErrorResponseCode]);

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

  if (!currentPage || ((isPoc && !isAdminUser) && currentPage === 'session-summary')) {
    return (
      <Redirect to={`/training-report/${trainingReportId}/session/${reportId.current}/${redirectPagePath}`} />
    );
  }

  const removeCompleteDataBaseOnRole = (roleData) => {
    const updatedRoleData = { ...roleData };
    if (!isAdminUser) {
      if (isPoc) {
      // Remove ownerComplete as this is tracked from the owner.
        delete updatedRoleData.ownerComplete;
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

        const keyArray = determineKeyArray(isAdminUser, isPoc);
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
      await onSave();
      updateShowSavedDraft(false);
    }
    const whereWeAre = applicationPages.find((p) => p.path === currentPage);
    const nextPage = applicationPages.find((p) => p.position === whereWeAre.position + 1);

    if ((isPoc || isAdminUser) && nextPage) {
      updatePage(nextPage.position);
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
      const keyArray = determineKeyArray(isAdminUser, isPoc);
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

      // If both are complete mark the session as complete.
      roleData.status = data.status;

      // Remove complete property data based on current role.
      roleData = removeCompleteDataBaseOnRole(roleData);

      // PUT it to the backend
      await updateSession(sessionId, {
        data: {
          ...roleData,
          status: TRAINING_REPORT_STATUSES.IN_PROGRESS,
        },
        trainingReportId,
        eventId: trainingReportId || null,
      });

      history.push('/training-reports/in-progress', { message: 'You successfully submitted the session.' });
    } catch (err) {
      // Close the modal if there is an error.
      modalRef.current.toggleModal(false);
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

  const nonFormUser = !isOwner && !isAdminUser && !isPoc && !isCollaborator && (sessionId !== 'new') && !error;
  if (reportFetched
      && ((formData.status === TRAINING_REPORT_STATUSES.COMPLETE
        && (!isAdminUser))
      || nonFormUser)) {
    return (
      <Redirect to={`/training-report/view/${trainingReportId}`} />
    );
  }

  const showSubmitModal = async () => {
    // updateIncompletePages();
    const isValidForm = await hookForm.trigger();

    if (isValidForm) {
      // Toggle the modal only if the form is valid.
      modalRef.current.toggleModal(true);
    }
  };

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
          <div className="margin-y-2">
            <h1 className="font-serif-2xl text-bold line-height-serif-2 margin-0">
              Training report - Session
            </h1>
            {
              formData && formData.event && (
                <div className="lead-paragraph">
                  {formData.event.data.eventId}
                  :
                  {' '}
                  {formData.eventName}
                </div>
              )
            }
          </div>
        </Grid>
      </Grid>
      <NetworkContext.Provider value={{ connectionActive: isOnlineMode() }}>
        {/* eslint-disable-next-line react/jsx-props-no-spreading */}
        <FormProvider {...hookForm}>
          <Modal
            modalRef={modalRef}
            heading="Are you sure you want to continue?"
          >
            <p>You will not be able to make changes once you save the session.</p>

            <Button
              type="submit"
              className="margin-right-1"
              onClick={() => onFormSubmit()}
            >
              Yes, continue
            </Button>
            <ModalToggleButton className="usa-button--subtle" closer modalRef={modalRef} data-focus="true">No, cancel</ModalToggleButton>
          </Modal>
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
            additionalData={{
              status: formData.status,
              pages: applicationPages,
              isAdminUser,
            }}
            formData={formData}
            pages={applicationPages}
            onFormSubmit={showSubmitModal}
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
            hideSideNav={!isPoc && !isAdminUser}
          />
        </FormProvider>
      </NetworkContext.Provider>
    </div>
  );
}

SessionForm.propTypes = {
  match: ReactRouterPropTypes.match.isRequired,
};
