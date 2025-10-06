import React from 'react';
import { Button, Textarea } from '@trussworks/react-uswds';
import { useFormContext } from 'react-hook-form';
import FormItem from '../../../components/FormItem';
import { reviewSubmitComponentProps } from './constants';
import ReadOnlyField from '../../../components/ReadOnlyField';
import ApproverStatusList from '../../ActivityReport/Pages/components/ApproverStatusList';

const path = 'needs-action-session-report';

export default function NeedsAction({ onSubmit }) {
  const { register, getValues } = useFormContext();

  const { approver, managerNotes } = getValues();

  return (
    <div data-testid="session-form-submit">
      <FormItem
        label="Creator notes"
        name="additionalNotes"
        required={false}
      >
        <Textarea inputRef={register()} name="additionalNotes" id="additionalNotes" />
      </FormItem>
      <ReadOnlyField label="Creator notes">
        {managerNotes}
      </ReadOnlyField>
      <ApproverStatusList approverStatus={[approver]} />
      <div className="display-flex margin-top-4">
        <Button id={`${path}-save-continue`} className="margin-right-1" type="button" onClick={onSubmit}>Update report</Button>
      </div>
    </div>
  );
}

NeedsAction.propTypes = reviewSubmitComponentProps;
