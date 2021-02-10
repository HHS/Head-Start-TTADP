import React from 'react';
import PropTypes from 'prop-types';

import {
  Dropdown, Form, Fieldset, Textarea, Alert, Button,
} from '@trussworks/react-uswds';

import { DECIMAL_BASE } from '../../../Constants';
import FormItem from '../../../components/FormItem';

const SubmitterReviewPage = ({
  submitted,
  register,
  approvers,
  handleSubmit,
  onFormSubmit,
  pages,
}) => {
  const filtered = pages.filter((p) => !(p.state === 'Complete' || p.review));
  const incompletePages = filtered.map((f) => f.label);
  const hasIncompletePages = incompletePages.length > 0;
  const setValue = (e) => {
    if (e === '') {
      return null;
    }
    return parseInt(e, DECIMAL_BASE);
  };

  const onSubmit = (e) => {
    if (!hasIncompletePages) {
      onFormSubmit(e);
    }
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
      <h2>Submit Report</h2>
      <Form className="smart-hub--form-large" onSubmit={handleSubmit(onSubmit)}>
        <Fieldset className="smart-hub--report-legend smart-hub--form-section" legend="Additional Notes">
          <FormItem
            label="Creator notes"
            name="additionalNotes"
            required={false}
          >
            <Textarea inputRef={register} id="additionalNotes" name="additionalNotes" />
          </FormItem>
        </Fieldset>
        <Fieldset className="smart-hub--report-legend smart-hub--form-section" legend="Review and submit report">
          <p className="margin-top-4">
            Submitting this form for approval means that you will no longer be in draft
            mode. Please review all information in each section before submitting to your
            manager for approval.
          </p>
          <FormItem
            label="Approving manager"
            name="approvingManagerId"
          >
            <Dropdown id="approvingManagerId" name="approvingManagerId" inputRef={register({ setValueAs: setValue, required: 'A manager must be assigned to the report before submitting' })}>
              <option name="default" value="" disabled hidden>- Select -</option>
              {approvers.map((approver) => (
                <option key={approver.id} value={approver.id}>{approver.name}</option>
              ))}
            </Dropdown>
          </FormItem>
        </Fieldset>
        {hasIncompletePages
        && (
        <Alert noIcon slim type="error">
          <b>Incomplete report</b>
          <br />
          This report cannot be submitted until all sections are complete.
          Please review the following sections:
          <ul>
            {incompletePages.map((page) => (
              <li key={page}>
                {page}
              </li>
            ))}
          </ul>
        </Alert>
        )}
        <Button type="submit">Submit for approval</Button>
      </Form>
    </>
  );
};

SubmitterReviewPage.propTypes = {
  submitted: PropTypes.bool.isRequired,
  register: PropTypes.func.isRequired,
  approvers: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.number,
    name: PropTypes.string,
  })).isRequired,
  handleSubmit: PropTypes.func.isRequired,
  onFormSubmit: PropTypes.func.isRequired,
  pages: PropTypes.arrayOf(PropTypes.shape({
    review: PropTypes.bool,
    state: PropTypes.string,
    label: PropTypes.string,
  })).isRequired,
};

export default SubmitterReviewPage;
