import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import {
  Dropdown, Form, Label, Fieldset, Textarea, Alert, Button, Accordion,
} from '@trussworks/react-uswds';
import { Helmet } from 'react-helmet';

import { fetchApprovers } from '../../../fetchers/activityReports';
import Container from '../../../components/Container';

const ReviewSubmit = ({
  hookForm, allComplete, onSubmit, submitted, reviewItems,
}) => {
  const [loading, updateLoading] = useState(true);
  const [possibleApprovers, updatePossibleApprovers] = useState([]);
  const { handleSubmit, register, formState } = hookForm;
  const { isValid } = formState;
  const valid = allComplete && isValid;

  useEffect(() => {
    updateLoading(true);
    const fetch = async () => {
      const approvers = await fetchApprovers();
      updatePossibleApprovers(approvers);
      updateLoading(false);
    };
    fetch();
  }, []);

  const onFormSubmit = (data) => {
    onSubmit(data);
  };

  if (loading) {
    return (
      <div>
        loading...
      </div>
    );
  }

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
        <h3>Submit Report</h3>
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
        <Form className="smart-hub--form-large" onSubmit={handleSubmit(onFormSubmit)}>
          <Fieldset className="smart-hub--report-legend smart-hub--form-section" legend="Additional Notes">
            <Label htmlFor="additionalNotes">Creator notes</Label>
            <Textarea inputRef={register} id="additionalNotes" name="additionalNotes" />
          </Fieldset>
          <Fieldset className="smart-hub--report-legend smart-hub--form-section" legend="Review and submit report">
            <p className="margin-top-4">
              Submitting this form for approval means that you will no longer be in draft mode.
              Please review all information in each section before submitting to your manager for
              approval.
            </p>
            <Label htmlFor="approvingManagerId">Approving manager</Label>
            <Dropdown id="approvingManagerId" name="approvingManagerId" inputRef={register({ setValueAs: setValue, required: true })}>
              <option name="default" value="" disabled hidden>Select a Manager...</option>
              {possibleApprovers.map((approver) => (
                <option key={approver.id} value={approver.id}>{approver.name}</option>
              ))}
            </Dropdown>
          </Fieldset>
          <Button type="submit" disabled={!valid}>Submit for approval</Button>
        </Form>
      </Container>
    </>
  );
};

ReviewSubmit.propTypes = {
  allComplete: PropTypes.bool.isRequired,
  onSubmit: PropTypes.func.isRequired,
  submitted: PropTypes.bool.isRequired,
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
