import React from 'react';
import PropTypes from 'prop-types';

import {
  Dropdown, Form, Label, Fieldset, Textarea, Alert, Button,
} from '@trussworks/react-uswds';

import { DECIMAL_BASE } from '../../../../../Constants';

const Draft = ({
  submitted,
  allComplete,
  register,
  approvers,
  valid,
  handleSubmit,
  onFormSubmit,
}) => {
  const setValue = (e) => {
    if (e === '') {
      return null;
    }
    return parseInt(e, DECIMAL_BASE);
  };
  return (
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
  );
};

Draft.propTypes = {
  submitted: PropTypes.bool.isRequired,
  allComplete: PropTypes.bool.isRequired,
  register: PropTypes.func.isRequired,
  approvers: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.number,
    name: PropTypes.string,
  })).isRequired,
  valid: PropTypes.bool.isRequired,
  handleSubmit: PropTypes.func.isRequired,
  onFormSubmit: PropTypes.func.isRequired,
};

export default Draft;
