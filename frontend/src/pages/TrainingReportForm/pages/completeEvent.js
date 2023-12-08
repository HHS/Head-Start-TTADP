import React, { useState, useContext, useEffect } from 'react';
import { TRAINING_REPORT_STATUSES } from '@ttahub/common';
import { useFormContext } from 'react-hook-form';
import { ErrorMessage as ReactHookFormError } from '@hookform/error-message';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet';
import { useHistory } from 'react-router-dom';
import {
  Alert, Button, Table, Dropdown, ErrorMessage,
} from '@trussworks/react-uswds';
import FormItem from '../../../components/FormItem';
import AppLoadingContext from '../../../AppLoadingContext';
import UserContext from '../../../UserContext';
import IndicatesRequiredField from '../../../components/IndicatesRequiredField';
import { sessionsByEventId } from '../../../fetchers/event';
import ReadOnlyField from '../../../components/ReadOnlyField';
import { InProgress, Closed } from '../../../components/icons';

const pages = {
  1: 'Event summary',
  2: 'Vision and goal',
};

const position = 3;
const path = 'complete-event';

const sessionStatusIcons = {
  'In progress': <InProgress />,
  Complete: <Closed />,
};

const CompleteEvent = ({
  onSubmit,
  formData,
  onSaveForm,
  onUpdatePage,
  DraftAlert,
}) => {
  const { setError, clearErrors, formState } = useFormContext();
  const { user } = useContext(UserContext);
  const { isAppLoading, setIsAppLoading } = useContext(AppLoadingContext);
  const [error, updateError] = useState();
  const [sessions, setSessions] = useState();
  const [showSubmissionError, setShowSubmissionError] = useState(false);
  const [showError, setShowError] = useState(false);

  const history = useHistory();

  // we store this in state and not the form data because we don't want to
  // automatically update the form object when the user changes the status dropdown
  // we need to validate before saving, and we only want the status to change when the
  // form is explicitly submitted
  const [updatedStatus, setUpdatedStatus] = useState(formData.status || 'Not started');

  const { errors } = formState;
  const isOwner = user && user.id === formData.ownerId;

  useEffect(() => {
    // we want to set the status to in progress if the user adds a session
    // and the status was previously not started
    if (sessions && sessions.length && updatedStatus === 'Not started') {
      setUpdatedStatus('In progress');
    }
  }, [sessions, updatedStatus]);

  useEffect(() => {
    async function getSessions() {
      try {
        setIsAppLoading(true);
        // get sessions by event ID fragment
        // a bit obtuse as is but waiting for generic refactor to
        // clean a lot of these up
        const res = await sessionsByEventId(formData.eventId.substring(formData.eventId.lastIndexOf('-') + 1));
        setSessions(res);
      } catch (e) {
        updateError('Unable to load sessions');
        setSessions([]);
      } finally {
        setIsAppLoading(false);
      }
    }

    if (!sessions && formData.eventId) {
      getSessions();
    }
  }, [formData.eventId, sessions, setIsAppLoading]);

  useEffect(() => {
    if (errors.status && !showError && ((sessions && sessions.length === 0) || !isOwner)) {
      /**
       * adding this to clear the error message after 10 seconds
       * this only shows & clears in the case where the "read only" status field is shown
       *
       */
      setShowError(true);
      setTimeout(() => {
        clearErrors('status');
        setShowError(false);
      }, 10000);
    }

    return () => {
      clearTimeout();
    };
  }, [clearErrors, errors.status, isOwner, sessions, showError]);

  const areAllSessionsComplete = sessions && sessions.length && sessions.every((session) => session.data.status === 'Complete');
  const incompleteSessions = !sessions || areAllSessionsComplete ? [] : sessions.filter((session) => session.data.status !== 'Complete');

  const incompletePages = (() => Object.keys(pages)
    .filter((key) => formData.pageState[key] !== TRAINING_REPORT_STATUSES.COMPLETE)
    .map((key) => pages[key]))();

  const areAllPagesComplete = incompletePages.length === 0;

  const onFormSubmit = async () => {
    if (updatedStatus !== 'Complete') {
      setError('status', { message: 'Event must be complete to submit' });
      return;
    }

    if (!areAllSessionsComplete || !areAllPagesComplete) {
      setShowSubmissionError(true);
      return;
    }

    await onSubmit(updatedStatus);
  };

  if (!sessions) {
    return null;
  }

  let options = [
    <option key="event-status-dropdown-option-in-progress">In progress</option>,
    <option key="event-status-dropdown-option-suspended">Suspended</option>,
    <option key="event-status-dropdown-option-complete">Complete</option>,
  ];

  if (!sessions.length) {
    options = [
      <option key="event-status-dropdown-option-not-started">Not started</option>,
      <option key="event-status-dropdown-option-suspended">Suspended</option>,
    ];
  }

  const SubmitButton = () => {
    const onSuspend = async () => {
      await onSaveForm(updatedStatus);
      const newPath = '/training-reports/suspended';
      history.push(newPath);
    };

    if (isOwner && updatedStatus === 'Suspended') {
      return (<Button id="submit-event" className="margin-right-1" type="button" disabled={isAppLoading} onClick={onSuspend}>Suspend event</Button>);
    }

    if (isOwner) {
      return (<Button id="submit-event" className="margin-right-1" type="button" disabled={isAppLoading} onClick={onFormSubmit}>Submit event</Button>);
    }

    return null;
  };

  return (
    <div className="padding-x-1">
      <Helmet>
        <title>Complete event</title>
      </Helmet>

      <IndicatesRequiredField />
      <p className="usa-prose">Review the information in each section before submitting. Once submitted, the report will no longer be editable.</p>
      {error && (
        <div className="margin-top-4">
          <Alert type="error">
            {error}
          </Alert>
        </div>
      )}

      <ReadOnlyField label="Number of sessions">
        {sessions.length}
      </ReadOnlyField>

      { (!isOwner) && (
        <>
          <ReadOnlyField label="Event status" name="status">
            {updatedStatus}
          </ReadOnlyField>
          <ReactHookFormError
            errors={errors}
            name="status"
            render={({ message }) => <ErrorMessage>{message}</ErrorMessage>}
          />
        </>
      )}

      {sessions.length > 0 && (
        <>
          <h3>Session status</h3>
          <Table fullWidth stackedStyle="default">
            <thead>
              <tr>
                <th scope="col">Session name</th>
                <th scope="col">Session status</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session) => (
                <tr key={session.id}>
                  <td data-label="Session name">
                    {session.data.sessionName}
                  </td>
                  <td data-label="Group status">
                    {sessionStatusIcons[session.data.status]}
                    {session.data.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </>
      )}

      { isOwner && (
      <div className="margin-top-4">
        <FormItem
          label="Event status"
          name="status"
          required
        >
          <Dropdown
            label="Event status"
            name="status"
            id="status"
            value={updatedStatus}
            onChange={(e) => {
              clearErrors('status');
              setUpdatedStatus(e.target.value);
            }}
          >
            {options}
          </Dropdown>
        </FormItem>
      </div>
      )}

      {showSubmissionError && (
      <div className="margin-top-4">
        <Alert type="error" noIcon>
          <p className="usa-prose text-bold margin-y-0">Incomplete report</p>
          {
              !areAllPagesComplete && (
                <>
                  <p className="usa-prose margin-y-0">This report cannot be submitted until all sections are complete. Please review the following sections:</p>
                  <ul className="usa-list">
                    {incompletePages.map((page) => (
                      <li key={`incomplete-page-${page}`}>
                        {page}
                      </li>
                    ))}
                  </ul>
                </>
              )
            }
          {
              !areAllSessionsComplete && (
                <>
                  <p className="usa-prose margin-y-0">This report cannot be submitted until all sessions are complete.</p>
                  <ul className="usa-list">
                    {incompleteSessions.map((session) => (
                      <li key={session.id}>
                        {session.data.sessionName}
                      </li>
                    ))}
                  </ul>
                </>
              )
            }
        </Alert>
      </div>
      )}

      <DraftAlert />
      <div className="display-flex">
        <SubmitButton />
        <Button id="save-draft" className="usa-button--outline" type="button" disabled={isAppLoading} onClick={() => onSaveForm(updatedStatus)}>Save draft</Button>
        <Button id="back-button" outline type="button" disabled={isAppLoading} onClick={() => { onUpdatePage(position - 1); }}>Back</Button>
      </div>

    </div>
  );
};

CompleteEvent.propTypes = {
  formData: PropTypes.shape({
    id: PropTypes.number,
    eventId: PropTypes.string,
    status: PropTypes.string,
    pageState: PropTypes.shape({
      1: PropTypes.string,
      2: PropTypes.string,
    }),
    ownerId: PropTypes.number,
  }),
  onSaveForm: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  onUpdatePage: PropTypes.func.isRequired,
  DraftAlert: PropTypes.node.isRequired,
};

CompleteEvent.defaultProps = {
  formData: {},
};

export default {
  position,
  review: false,
  label: 'Complete event',
  path,
  isPageComplete: ({ getValues }) => {
    const { status } = getValues();
    return status === TRAINING_REPORT_STATUSES.COMPLETE;
  },
  render:
    (
      _additionalData,
      formData,
      _reportId,
      _isAppLoading,
      _onContinue,
      onSaveForm,
      onUpdatePage,
      _weAreAutoSaving,
      _datePickerKey,
      onSubmit,
      DraftAlert,
    ) => (
      <CompleteEvent
        onSubmit={onSubmit}
        onSaveForm={onSaveForm}
        formData={formData}
        onUpdatePage={onUpdatePage}
        DraftAlert={DraftAlert}
      />
    ),
};
