import React from 'react';
import { startCase } from 'lodash';
import { Button, Dropdown } from '@trussworks/react-uswds';
import { APPROVER_STATUSES } from '@ttahub/common';
import { useFormContext } from 'react-hook-form';
import FormItem from '../../../components/FormItem';
import HookFormRichEditor from '../../../components/HookFormRichEditor';
import { reviewSubmitComponentProps } from './constants';
import ReadOnlyField from '../../../components/ReadOnlyField';
import ReadOnlyEditor from '../../../components/ReadOnlyEditor';
import ApproverStatusList from '../../ActivityReport/Pages/components/ApproverStatusList';

const path = 'approver-session-report';

export default function Approve({ onFormReview }) {
  const { register, getValues } = useFormContext();

  const {
    additionalNotes,
    approver,
    dateSubmitted,
    status,
  } = getValues();

  const approverStatus = [
    {
      status,
      user: {
        fullName: approver?.fullName || '',
      },
    },
  ];

  return (
    <div data-testid="session-form-approver">
      <ReadOnlyField label="Creator notes">
        <ReadOnlyEditor value={additionalNotes} ariaLabel="Creator notes" />
      </ReadOnlyField>
      <FormItem
        label="Add manager notes"
        name="managerNotes"
        required={false}
      >
        <HookFormRichEditor ariaLabel="Add manager notes" name="managerNotes" />
      </FormItem>
      <ReadOnlyField
        label="Date submitted"
      >
        {dateSubmitted}
      </ReadOnlyField>
      <FormItem
        name="approvalStatus"
        label="Choose approval status"
        className="margin-bottom-4"
      >
        <Dropdown
          id="approvalStatus"
          name="approvalStatus"
          inputRef={register({ required: true })}
        >
          <option value="" selected>- Select -</option>
          {Object.values(APPROVER_STATUSES).map((reportStatus) => (
            <option key={reportStatus} value={reportStatus}>{startCase(reportStatus)}</option>
          ))}
        </Dropdown>
      </FormItem>
      <ApproverStatusList approverStatus={approverStatus} />
      <div className="display-flex margin-top-4">
        <Button id={`${path}-save-continue`} className="margin-right-1" type="button" onClick={onFormReview}>Submit </Button>
      </div>
    </div>
  );
}

Approve.propTypes = reviewSubmitComponentProps;
