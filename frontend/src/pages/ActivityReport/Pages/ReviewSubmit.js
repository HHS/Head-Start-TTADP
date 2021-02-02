import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Dropdown, Form, Label, Fieldset, Textarea, Alert, Button, Accordion,
} from '@trussworks/react-uswds';
import { Helmet } from 'react-helmet';

import Container from '../../../components/Container';
import './ReviewSubmit.css';

const possibleStatus = [
  'Approved',
  'Needs Action',
];

const ReviewSubmit = ({
  hookForm,
  allComplete,
  onSubmit,
  onReview,
  reviewItems,
  approvers,
  approvingManager,
  initialData,
}) => {
  const { handleSubmit, register, formState } = hookForm;
  const { additionalNotes } = initialData;
  const { isValid } = formState;
  const valid = allComplete && isValid;

  const [submitted, updateSubmitted] = useState(false);
  const [reviewed, updateReviewed] = useState(false);
  const [error, updateError] = useState();

  const onFormSubmit = async (data) => {
    try {
      await onSubmit(data);
      updateSubmitted(true);
      updateError();
    } catch (e) {
      updateSubmitted(false);
      updateError('Unable to submit report');
    }
  };

  const onFormReview = async (data) => {
    try {
      await onReview(data);
      updateReviewed(true);
      updateError();
    } catch (e) {
      updateReviewed(false);
      updateError('Unable to review report');
    }
  };

  const setValue = (e) => {
    if (e === '') {
      return null;
    }
    return parseInt(e, 10);
  };

  return (
    <>
      <Helmet>
        <title>Review and submit</title>
      </Helmet>
      <Accordion bordered={false} items={reviewItems} />
      <Container skipTopPadding className="margin-top-2 padding-top-2">
        {error && (
        <Alert noIcon className="margin-y-4" type="error">
          <b>Error</b>
          <br />
          {error}
        </Alert>
        )}
        {!approvingManager
          && (
            <>
              {submitted
              && (
              <Alert noIcon className="margin-y-4" type="success">
                <b>Success</b>
                <br />
                This report was successfully submitted for approval
              </Alert>
              )}
              {!allComplete
              && (
              <Alert noIcon className="margin-y-4" type="error">
                <b>Incomplete report</b>
                <br />
                This report cannot be submitted until all sections are complete
              </Alert>
              )}
              <h2>Submit Report</h2>
              <Form className="smart-hub--form-large" onSubmit={handleSubmit(onFormSubmit)}>
                <Fieldset className="smart-hub--report-legend smart-hub--form-section" legend="Additional Notes">
                  <Label htmlFor="additionalNotes">Creator notes</Label>
                  <Textarea inputRef={register} id="additionalNotes" name="additionalNotes" />
                </Fieldset>
                <Fieldset className="smart-hub--report-legend smart-hub--form-section" legend="Review and submit report">
                  <p className="margin-top-4">
                    Submitting this form for approval means that you will no longer be in draft
                    mode. Please review all information in each section before submitting to your
                    manager for approval.
                  </p>
                  <Label htmlFor="approvingManagerId">Approving manager</Label>
                  <Dropdown id="approvingManagerId" name="approvingManagerId" inputRef={register({ setValueAs: setValue, required: true })}>
                    <option name="default" value="" disabled hidden>Select a Manager...</option>
                    {approvers.map((approver) => (
                      <option key={approver.id} value={approver.id}>{approver.name}</option>
                    ))}
                  </Dropdown>
                </Fieldset>
                <Button type="submit" disabled={!valid}>Submit for approval</Button>
              </Form>
            </>
          )}
        {approvingManager
          && (
            <>
              {reviewed
              && (
              <Alert noIcon className="margin-y-4" type="success">
                <b>Success</b>
                <br />
                Your review of this report was successfully submitted
              </Alert>
              )}
              <h2>Review and approve report</h2>
              <div className="smart-hub--creator-notes">
                <p>
                  <span className="text-bold">Creator notes</span>
                  <br />
                  <br />
                  { additionalNotes || 'No creator notes' }
                </p>
              </div>
              <Form className="smart-hub--form-large" onSubmit={handleSubmit(onFormReview)}>
                <Fieldset className="smart-hub--report-legend smart-hub--form-section" legend="Review and submit report">
                  <Label htmlFor="managerNotes">Manager notes</Label>
                  <Textarea inputRef={register} id="managerNotes" name="managerNotes" />
                </Fieldset>
                <Label htmlFor="status">Choose report status</Label>
                <Dropdown id="status" name="status" defaultValue="" inputRef={register({ required: true })}>
                  <option name="default" value="" disabled hidden>- Select -</option>
                  {possibleStatus.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </Dropdown>
                <Button type="submit" disabled={!valid}>Submit</Button>
              </Form>
            </>
          )}
      </Container>
    </>
  );
};

ReviewSubmit.propTypes = {
  approvers: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      name: PropTypes.string.isRequired,
    }),
  ).isRequired,
  allComplete: PropTypes.bool.isRequired,
  onSubmit: PropTypes.func.isRequired,
  onReview: PropTypes.func.isRequired,
  approvingManager: PropTypes.bool.isRequired,
  initialData: PropTypes.shape({
    additionalNotes: PropTypes.string,
  }).isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  hookForm: PropTypes.object.isRequired,
  reviewItems: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      content: PropTypes.node.isRequired,
    }),
  ).isRequired,
};

export default ReviewSubmit;
