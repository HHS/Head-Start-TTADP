import React, { useState, useContext, useEffect } from 'react';
import { REPORT_STATUSES } from '@ttahub/common';
import { useFormContext } from 'react-hook-form';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet';
import {
  Form, Alert, Button, Table, Dropdown,
} from '@trussworks/react-uswds';
import FormItem from '../../../components/FormItem';
import AppLoadingContext from '../../../AppLoadingContext';
import Container from '../../../components/Container';
import IndicatesRequiredField from '../../../components/IndicatesRequiredField';
import NavigatorHeader from '../../../components/Navigator/components/NavigatorHeader';
import { sessionsByEventId } from '../../../fetchers/event';
import ReadOnlyField from '../../../components/ReadOnlyField';
import { InProgress, Closed } from '../../../components/icons';

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
}) => {
  const { setError } = useFormContext();
  const { isAppLoading, setIsAppLoading } = useContext(AppLoadingContext);
  const [error, updateError] = useState();
  const [sessions, setSessions] = useState();

  // we store this in state and not the form data because we don't want to
  // automatically update the form object when the user changes the status dropdown
  // we need to validate before saving, and we only want the status to change when the
  // form is explicitly submitted
  const [updatedStatus, setUpdatedStatus] = useState(formData.status || 'Not started');

  const areAllSessionsComplete = sessions && sessions.length && sessions.every((session) => session.data.status === 'Complete');

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
        const res = await sessionsByEventId(formData.id);
        setSessions(res.filter((s) => s.data.sessionName));
      } catch (e) {
        updateError('Unable to load sessions');
        setSessions([]);
      } finally {
        setIsAppLoading(false);
      }
    }

    if (!sessions && formData.id) {
      getSessions();
    }
  }, [formData.id, sessions, setIsAppLoading]);

  const onFormSubmit = async () => {
    if (updatedStatus !== 'Complete') {
      setError('status', { message: 'Status must be complete to submit' });
      return;
    }

    if (!areAllSessionsComplete) {
      setError('status', { message: 'All sessions must be complete to submit event' });
      return;
    }

    await onSubmit(updatedStatus);
  };

  if (!sessions) {
    return null;
  }

  const options = [
    <option key="event-status-dropdown-option-in-progress">In progress</option>,
    <option key="event-status-dropdown-option-suspended">Suspended</option>,
    <option key="event-status-dropdown-option-complete">Complete</option>,
  ];

  // add not started to the beginning of the list if there are no sessions
  if (sessions.length === 0) {
    options.unshift(<option key="event-status-dropdown-option-not-started">Not started</option>);
  }

  return (
    <>
      <Helmet>
        <title>Complete event</title>
      </Helmet>

      <NavigatorHeader
        label="Complete event"
        formData={formData}
      />

      <IndicatesRequiredField />
      <p className="usa-prose">Review the information in each section before subitting. Once submitted, the report will no longer be editable.</p>
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
            onChange={(e) => setUpdatedStatus(e.target.value)}
          >
            {options}
          </Dropdown>
        </FormItem>
      </div>

      <div className="display-flex">
        <Button id="submit-event" className="margin-right-1" type="button" disabled={isAppLoading} onClick={onFormSubmit}>Submit event</Button>
        <Button id="save-draft" className="usa-button--outline" type="button" disabled={isAppLoading} onClick={onSaveForm}>Save draft</Button>
        <Button id="back-button" outline type="button" disabled={isAppLoading} onClick={() => { onUpdatePage(position - 1); }}>Back</Button>
      </div>
    </>
  );
};

CompleteEvent.propTypes = {
  formData: PropTypes.shape({
    id: PropTypes.number,
    status: PropTypes.string,
  }),
  onSaveForm: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  onUpdatePage: PropTypes.func.isRequired,
};

CompleteEvent.defaultProps = {
  formData: {},
};

export default {
  position,
  review: true,
  label: 'Complete event',
  path,
  isPageComplete: (formData) => formData.calculatedStatus === REPORT_STATUSES.SUBMITTED,
  render:
    (
      formData,
      onSubmit,
      _additionalData,
      _onReview,
      _isApprover,
      _isPendingApprover,
      _onResetToDraft,
      onSaveForm,
      _navigatorPages,
      _reportCreator,
      _lastSaveTime,
      onUpdatePage,
    ) => (
      <Container skipTopPadding>
        <Form
          className="smart-hub--form-large smart-hub--form__activity-report-form"
        >
          <CompleteEvent
            onSubmit={onSubmit}
            onSaveForm={onSaveForm}
            formData={formData}
            onUpdatePage={onUpdatePage}
          />
        </Form>
      </Container>
    ),
};
