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
  watch,
  valid,
  handleSubmit,
  onFormReview,
}) => {
  const watchTextValue = watch('managerNotes');
  const textAreaClass = watchTextValue !== '' ? 'yes-print' : 'no-print';

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
          <Textarea inputRef={register} id="managerNotes" name="managerNotes" className={textAreaClass} />
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
};

Review.propTypes = {
  reviewed: PropTypes.bool.isRequired,
  additionalNotes: PropTypes.string.isRequired,
  register: PropTypes.func.isRequired,
  watch: PropTypes.func.isRequired,
  valid: PropTypes.bool.isRequired,
  handleSubmit: PropTypes.func.isRequired,
  onFormReview: PropTypes.func.isRequired,
};

export default Review;
