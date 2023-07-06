import React, { useState } from 'react';
import { REPORT_STATUSES } from '@ttahub/common';
import { useFormContext } from 'react-hook-form';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet';
import {
  Form, Button, Dropdown, Alert,
} from '@trussworks/react-uswds';
import FormItem from '../../../components/FormItem';
import Container from '../../../components/Container';
import IndicatesRequiredField from '../../../components/IndicatesRequiredField';
import NavigatorHeader from '../../../components/Navigator/components/NavigatorHeader';

const position = 4;
const path = 'complete-session';

const pages = {
  1: 'Session summary',
  2: 'Participants',
  3: 'Next steps',
};

const CompleteSession = ({
  onSubmit,
  formData,
  onSaveForm,
  onUpdatePage,
}) => {
  const { setError } = useFormContext();

  // we store this in state and not the form data because we don't want to
  // automatically update the form object when the user changes the status dropdown
  // we need to validate before saving, and we only want the status to change when the
  // form is explicitly submitted
  const [updatedStatus, setUpdatedStatus] = useState(formData.status || 'In progress');
  const [showSubmissionError, setShowSubmissionError] = useState(false);

  const incompletePages = (() => Object.keys(pages)
    .filter((key) => formData.pageState[key] !== 'Complete')
    .map((key) => pages[key]))();

  const areAllPagesComplete = !incompletePages.length;

  const onFormSubmit = async () => {
    if (updatedStatus !== 'Complete') {
      setError('status', { message: 'Status must be complete to submit session' });
      return;
    }

    if (incompletePages.length) {
      setShowSubmissionError(true);
      return;
    }

    await onSubmit(updatedStatus);
  };

  const options = [
    <option key="session-status-dropdown-option-in-progress">In progress</option>,
    <option key="session-status-dropdown-option-complete">Complete</option>,
  ];

  return (
    <div className="padding-x-1">
      <Helmet>
        <title>Complete session</title>
      </Helmet>

      <NavigatorHeader
        label="Complete session"
        formData={formData}
      />

      <IndicatesRequiredField />
      <p className="usa-prose">
        Review the information in each section before submitting the session.
        Once submitted, the report is editable until the event reviewer submits their review.
      </p>

      <div className="margin-top-4">
        <FormItem
          label="Session status"
          name="status"
          required
        >
          <Dropdown
            label="Session status"
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
        <Button id="submit-event" className="margin-right-1" type="button" onClick={onFormSubmit}>Submit session</Button>
        <Button id="save-draft" className="usa-button--outline" type="button" onClick={onSaveForm}>Save draft</Button>
        <Button id="back-button" outline type="button" onClick={() => { onUpdatePage(position - 1); }}>Back</Button>
      </div>

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
          </Alert>
        </div>
      )}

    </div>
  );
};

CompleteSession.propTypes = {
  formData: PropTypes.shape({
    id: PropTypes.number,
    status: PropTypes.string,
    pageState: PropTypes.shape({
      1: PropTypes.string,
      2: PropTypes.string,
      3: PropTypes.string,
    }),
  }),
  onSaveForm: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  onUpdatePage: PropTypes.func.isRequired,
};

CompleteSession.defaultProps = {
  formData: {},
};

export default {
  position,
  review: true,
  label: 'Complete session',
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
          <CompleteSession
            onSubmit={onSubmit}
            onSaveForm={onSaveForm}
            formData={formData}
            onUpdatePage={onUpdatePage}
          />
        </Form>
      </Container>
    ),
};
