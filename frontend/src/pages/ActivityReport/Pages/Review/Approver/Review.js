import React from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';
import {
  Dropdown, Form, Label, Fieldset, Textarea, Alert, Button,
} from '@trussworks/react-uswds';

import { managerReportStatuses } from '../../../../../Constants';

const Review = ({
  reviewed,
  additionalNotes,
  register,
  valid,
  handleSubmit,
  onFormReview,
}) => (
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
        { additionalNotes }
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
        {managerReportStatuses.map((status) => (
          <option key={status} value={status}>{_.startCase(status)}</option>
        ))}
      </Dropdown>
      <Button type="submit" disabled={!valid}>Submit</Button>
    </Form>
  </>
);

Review.propTypes = {
  reviewed: PropTypes.bool.isRequired,
  additionalNotes: PropTypes.string,
  register: PropTypes.func.isRequired,
  valid: PropTypes.bool.isRequired,
  handleSubmit: PropTypes.func.isRequired,
  onFormReview: PropTypes.func.isRequired,
};

Review.defaultProps = {
  additionalNotes: 'No creator notes',
};

export default Review;
