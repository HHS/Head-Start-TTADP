import React from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';
import {
  Dropdown, Form, Label, Fieldset, Textarea, Alert, Button,
} from '@trussworks/react-uswds';
import { useFormContext } from 'react-hook-form';

import { managerReportStatuses } from '../../../../../Constants';
import FormItem from '../../../../../components/FormItem';

const Review = ({
  reviewed,
  additionalNotes,
  onFormReview,
}) => {
  const { register, handleSubmit } = useFormContext();
  return (
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
      <div className="smart-hub--creator-notes" aria-label="additionalNotes">
        <p>
          <span className="text-bold">Creator notes</span>
          <br />
          <br />
          { additionalNotes || 'No creator notes'}
        </p>
      </div>
      <Form className="smart-hub--form-large" onSubmit={handleSubmit(onFormReview)}>
        <Fieldset className="smart-hub--report-legend smart-hub--form-section" legend="Review and submit report">
          <Label htmlFor="managerNotes">Manager notes</Label>
          <Textarea inputRef={register} id="managerNotes" name="managerNotes" />
        </Fieldset>
        <FormItem
          name="status"
          label="Choose report status"
        >
          <Dropdown id="status" name="status" defaultValue="" inputRef={register({ required: 'Please select a status before submitting your review' })}>
            <option name="default" value="" disabled hidden>- Select -</option>
            {managerReportStatuses.map((status) => (
              <option key={status} value={status}>{_.startCase(status)}</option>
            ))}
          </Dropdown>
        </FormItem>
        <Button type="submit">Submit</Button>
      </Form>
    </>
  );
};

Review.propTypes = {
  reviewed: PropTypes.bool.isRequired,
  additionalNotes: PropTypes.string.isRequired,
  onFormReview: PropTypes.func.isRequired,
};

export default Review;
