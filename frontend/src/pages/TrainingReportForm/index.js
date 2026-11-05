import { Alert, Button, Form, Grid, ModalToggleButton } from '@trussworks/react-uswds';
import moment from 'moment';
import React, { useContext, useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet';
import { FormProvider, useForm } from 'react-hook-form';
import { useHistory } from 'react-router-dom';
import ReactRouterPropTypes from 'react-router-prop-types';
import AppLoadingContext from '../../AppLoadingContext';
import BackLink from '../../components/BackLink';
import Modal from '../../components/VanillaModal';
import { eventById, updateEvent } from '../../fetchers/event';
import { getTrainingReportUsers } from '../../fetchers/users';
import useLocalStorage from '../../hooks/useLocalStorage';
import NetworkContext, { isOnlineMode } from '../../NetworkContext';
import regionIdFromEventId from '../../utils/regionIdFromEventId';
import { defaultValues, LOCAL_STORAGE_ADDITIONAL_DATA_KEY } from './constants';
import EventSummary from './pages/eventSummary';

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
  const { data, updatedAt, ...fields } = event;

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

export default function TrainingReportForm({ match }) {
  const {
    params: { trainingReportId },
  } = match;
  const reportId = useRef();
  const modalRef = useRef();

  // for redirects if a page is not provided
  const history = useHistory();

  /* ============

   * the following errors are a bit confusingly named, but
   * I'm copying the pattern from the ActivityReport
   */

  // this error is for errors fetching reports, its the top error
  const [error, setError] = useState();

  /* ============ */

  // this attempts to track whether or not we're online
  // (or at least, if the backend is responding)
  const [connectionActive] = useState(true);

  /* ============
   * this hook handles the interface with
   * local storage
   */

  const [additionalData, updateAdditionalData, localStorageAvailable] = useLocalStorage(
    LOCAL_STORAGE_ADDITIONAL_DATA_KEY(trainingReportId),
    {
      users: {
        pointOfContact: [],
        collaborators: [],
      },
    }
  );

  // we use both of these to determine if we're in the loading screen state
  // (see the use effect below)
  const [reportFetched, setReportFetched] = useState(false);
  const [fetchedRegionId, setFetchedRegionId] = useState(null);

  // this holds the key for the date pickers to force re-render
  // as the truss component doesn't re-render when the default value changes
  const [datePickerKey, setDatePickerKey] = useState(Date.now().toString());

  // these drive the "Draft saved on ..." confirmation alert
  const [lastSaveTime, updateLastSaveTime] = useState(null);
  const [showSavedDraft, updateShowSavedDraft] = useState(false);

  /* ============
   */

  const hookForm = useForm({
    mode: 'onBlur',
    defaultValues,
    shouldUnregister: false,
  });

  // the region is encoded in the event id, so region-dependent requests can start
  // alongside the event fetch instead of waiting for it. Once the event loads, its
  // actual region wins (an event can be reassigned to another region).
  const eventRegion = fetchedRegionId ?? regionIdFromEventId(trainingReportId);
  const formData = hookForm.getValues();
  const { setIsAppLoading, isAppLoading } = useContext(AppLoadingContext);

  // the loader only waits on the event; users and trainers fill in when they arrive
  useEffect(() => {
    setIsAppLoading(!reportFetched);
  }, [reportFetched, setIsAppLoading]);

  // don't leave the loader up if we navigate away mid-load
  useEffect(() => () => setIsAppLoading(false), [setIsAppLoading]);

  useEffect(() => {
    // fetch available users (refetches if the event's real region differs from the id prefix)
    if (!eventRegion) {
      return undefined;
    }

    let cancelled = false;

    async function fetchUsers() {
      try {
        const users = await getTrainingReportUsers(eventRegion, trainingReportId);
        if (!cancelled) {
          updateAdditionalData({ users });
        }
      } catch (e) {
        if (!cancelled) {
          setError('Error fetching collaborators and points of contact');
        }
      }
    }

    fetchUsers();

    return () => {
      cancelled = true;
    };
  }, [eventRegion, updateAdditionalData, trainingReportId]);

  useEffect(() => {
    // fetch event report data
    if (!trainingReportId) {
      return undefined;
    }

    let cancelled = false;

    async function fetchReport() {
      try {
        // the edit form doesn't use session reports, so skip loading them
        const event = await eventById(trainingReportId, false, { includeSessions: false });
        if (cancelled) {
          return;
        }
        resetFormData(hookForm.reset, event);
        reportId.current = trainingReportId;
        setFetchedRegionId(event.regionId ?? null);
      } catch (e) {
        if (!cancelled) {
          history.push(`/something-went-wrong/${e.status}`);
        }
      } finally {
        if (!cancelled) {
          setReportFetched(true);
          setDatePickerKey(Date.now().toString());
        }
      }
    }
    fetchReport();

    return () => {
      cancelled = true;
    };
  }, [hookForm.reset, trainingReportId, history]);

  useEffect(() => {
    // set error if no training report id
    if (!trainingReportId) {
      setError('No training report id provided');
    }
  }, [trainingReportId]);

  /* istanbul ignore next: tested elsewhere */
  const onSave = async () => {
    try {
      // reset the error message
      setError('');
      hookForm.clearErrors();

      setIsAppLoading(true);

      // grab the newest data from the form
      const { ownerId, pocIds, collaboratorIds, regionId, sessionReports, ...data } =
        hookForm.getValues();

      const dataToPut = {
        data,
        ownerId: ownerId || null,
        pocIds: pocIds || null,
        collaboratorIds,
        regionId: regionId || null,
      };

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

  /* istanbul ignore next: hard to test successful submissions */
  const okFormSubmit = async () => {
    // Get isValid from the form.
    try {
      // reset the error message
      setError('');
      setIsAppLoading(true);

      // grab the newest data from the form
      const { ownerId, pocIds, collaboratorIds, regionId, sessionReports, ...data } =
        hookForm.getValues();

      // PUT it to the backend
      const updatedEvent = await updateEvent(trainingReportId, {
        data: {
          ...data,
          eventSubmitted: true,
        },
        ownerId: ownerId || null,
        pocIds: pocIds || null,
        collaboratorIds,
        regionId: regionId || null,
      });
      resetFormData(hookForm.reset, updatedEvent);

      const dateStr = moment().format('MM/DD/YYYY [at] h:mm a z');
      const message = {
        eventId: updatedEvent.eventId,
        dateStr,
      };

      // Redirect back based current status tab.
      const redirect = updatedEvent.data.status.replace(' ', '-').toLowerCase();
      history.push(`/training-reports/${redirect}`, { message });
    } catch (err) {
      // Close the modal and show the error message.
      setError('There was an error saving the training report. Please try again later.');
    } finally {
      setIsAppLoading(false);
      modalRef.current.toggleModal(false);
    }
  };

  const backLinkUrl = (() => {
    if (!formData || !formData.status) {
      return '/training-reports/not-started';
    }

    return `/training-reports/${formData.status.replace(' ', '-').toLowerCase()}`;
  })();

  const showSubmitModal = async () => {
    const valid = await hookForm.trigger();
    if (valid) {
      // Toggle the modal only if the form is valid.
      modalRef.current.toggleModal(true);
    }
  };

  return (
    <div className="smart-hub-training-report">
      {error && (
        <Alert className="margin-bottom-3" type="error">
          {error}
        </Alert>
      )}
      <Helmet
        titleTemplate="%s - Training Report | TTA Hub"
        defaultTitle="Event - Training Report | TTA Hub"
      />
      <BackLink to={backLinkUrl}>Back to Training Reports</BackLink>
      <Grid row className="flex-justify">
        <Grid col="auto">
          <div className="margin-top-2 margin-bottom-4">
            <h1 className="font-serif-2xl text-bold line-height-serif-2 margin-0 margin-bottom-1">
              Training report - Event
            </h1>
            <div className="lead-paragraph">
              {formData.eventId}: {formData.eventName}
            </div>
          </div>
        </Grid>
      </Grid>
      <NetworkContext.Provider
        value={{
          connectionActive: isOnlineMode() && connectionActive,
          localStorageAvailable,
        }}
      >
        {/* eslint-disable-next-line react/jsx-props-no-spreading */}
        <FormProvider {...hookForm}>
          <Modal modalRef={modalRef} heading="Are you sure you want to continue?">
            <p>You will not be able to make changes once you save the event.</p>

            <Button type="submit" className="margin-right-1" onClick={() => okFormSubmit()}>
              Yes, continue
            </Button>
            <ModalToggleButton
              className="usa-button--subtle"
              closer
              modalRef={modalRef}
              data-focus="true"
            >
              No, cancel
            </ModalToggleButton>
          </Modal>
          <Form className="smart-hub--form-large smart-hub--form__activity-report-form">
            <EventSummary
              additionalData={additionalData}
              formData={formData}
              regionId={eventRegion}
              isAppLoading={isAppLoading}
              onSaveDraft={onSave}
              datePickerKey={datePickerKey}
              showSubmitModal={showSubmitModal}
              lastSaveTime={lastSaveTime}
              showSavedDraft={showSavedDraft}
              updateShowSavedDraft={updateShowSavedDraft}
            />
          </Form>
        </FormProvider>
      </NetworkContext.Provider>
    </div>
  );
}

TrainingReportForm.propTypes = {
  match: ReactRouterPropTypes.match.isRequired,
};
