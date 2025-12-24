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
  Alert, Grid, Form, Button, ModalToggleButton,
} from '@trussworks/react-uswds';
import { useHistory } from 'react-router-dom';
import { FormProvider, useForm } from 'react-hook-form';
import useLocalStorage from '../../hooks/useLocalStorage';
import {
  LOCAL_STORAGE_ADDITIONAL_DATA_KEY,
  defaultValues,
} from './constants';
import { getTrainingReportUsers } from '../../fetchers/users';
import { eventById, updateEvent } from '../../fetchers/event';
import NetworkContext, { isOnlineMode } from '../../NetworkContext';
import BackLink from '../../components/BackLink';
import EventSummary from './pages/eventSummary';
import AppLoadingContext from '../../AppLoadingContext';
import Modal from '../../components/VanillaModal';

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

export default function TrainingReportForm({ match }) {
  const { params: { trainingReportId } } = match;
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
  const { setIsAppLoading, isAppLoading } = useContext(AppLoadingContext);

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
        setError('Error fetching collaborators and points of contact');
      } finally {
        setAdditionalDataFetched(true);
      }
    }

    fetchUsers();
  }, [additionalDataFetched, eventRegion, isAppLoading, updateAdditionalData, trainingReportId]);

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
        history.push(`/something-went-wrong/${e.status}`);
      } finally {
        setReportFetched(true);
        setDatePickerKey(Date.now().toString());
      }
    }
    fetchReport();
  }, [hookForm.reset, isAppLoading, reportFetched, trainingReportId, history]);

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
        data,
        ownerId: ownerId || null,
        pocIds: pocIds || null,
        collaboratorIds,
        regionId: regionId || null,
      };

      // PUT it to the backend
      const updatedEvent = await updateEvent(trainingReportId, dataToPut);
      resetFormData(hookForm.reset, updatedEvent);
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
      const {
        ownerId,
        pocIds,
        collaboratorIds,
        regionId,
        sessionReports,
        ...data
      } = hookForm.getValues();

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
        eventId: updatedEvent.data.eventId,
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
      { error
      && (
      <Alert className="margin-bottom-3" type="error">
        {error}
      </Alert>
      )}
      <Helmet titleTemplate="%s - Training Report | TTA Hub" defaultTitle="Event - Training Report | TTA Hub" />
      <BackLink to={backLinkUrl}>
        Back to Training Reports
      </BackLink>
      <Grid row className="flex-justify">
        <Grid col="auto">
          <div className="margin-top-2 margin-bottom-4">
            <h1 className="font-serif-2xl text-bold line-height-serif-2 margin-0 margin-bottom-1">
              Training report - Event
            </h1>
            <div className="lead-paragraph">
              {formData.eventId}
              :
              {' '}
              {formData.eventName}
            </div>
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
          <Modal
            modalRef={modalRef}
            heading="Are you sure you want to continue?"
          >
            <p>You will not be able to make changes once you save the event.</p>

            <Button
              type="submit"
              className="margin-right-1"
              onClick={() => okFormSubmit()}
            >
              Yes, continue
            </Button>
            <ModalToggleButton className="usa-button--subtle" closer modalRef={modalRef} data-focus="true">No, cancel</ModalToggleButton>
          </Modal>
          <Form
            className="smart-hub--form-large smart-hub--form__activity-report-form"
          >
            <EventSummary
              additionalData={additionalData}
              formData={formData}
              isAppLoading={isAppLoading}
              onSaveDraft={onSave}
              datePickerKey={datePickerKey}
              showSubmitModal={showSubmitModal}
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
