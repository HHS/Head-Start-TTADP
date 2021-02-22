import React from 'react';
import PropTypes from 'prop-types';
import { useFormContext } from 'react-hook-form';
import {
  Dropdown, Form, Fieldset, Textarea, Alert, Button,
} from '@trussworks/react-uswds';

import IncompletePages from './IncompletePages';
import { DECIMAL_BASE } from '../../../../../Constants';
import FormItem from '../../../../../components/FormItem';

const Draft = ({
  submitted,
  approvers,
  onFormSubmit,
  incompletePages,
}) => {
  const { watch, register, handleSubmit } = useFormContext();
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
  const watchTextValue = watch('additionalNotes');
  const textAreaClass = watchTextValue !== '' ? 'yes-print' : 'no-print';

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
            <Textarea inputRef={register} id="additionalNotes" name="additionalNotes" className={textAreaClass} />
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
        {hasIncompletePages && <IncompletePages incompletePages={incompletePages} />}
        <Button type="submit">Submit for approval</Button>
      </Form>
    </>
  );
};

Draft.propTypes = {
  submitted: PropTypes.bool.isRequired,
  approvers: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.number,
    name: PropTypes.string,
  })).isRequired,
  onFormSubmit: PropTypes.func.isRequired,
  incompletePages: PropTypes.arrayOf(PropTypes.string).isRequired,
};

export default Draft;
