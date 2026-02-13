import React from 'react'
import { Button } from '@trussworks/react-uswds'
import { useFormContext } from 'react-hook-form'
import FormItem from '../../../components/FormItem'
import HookFormRichEditor from '../../../components/HookFormRichEditor'
import { reviewSubmitComponentProps } from './constants'
import ReadOnlyField from '../../../components/ReadOnlyField'
import ReadOnlyEditor from '../../../components/ReadOnlyEditor'
import ApproverStatusList from '../../ActivityReport/Pages/components/ApproverStatusList'

const path = 'needs-action-session-report'

export default function NeedsAction({ onSubmit }) {
  const { watch } = useFormContext()

  const { approver, managerNotes, status } = watch()

  const approverStatus = [
    {
      status,
      user: {
        fullName: approver?.fullName || '',
      },
    },
  ]

  return (
    <div data-testid="session-form-needs-action">
      <FormItem label="Creator notes" name="additionalNotes" required={false}>
        <HookFormRichEditor ariaLabel="Creator notes" name="additionalNotes" />
      </FormItem>
      <div className="margin-top-4">
        <ReadOnlyField label="Manager notes">
          <ReadOnlyEditor value={managerNotes} ariaLabel="Manager notes" />
        </ReadOnlyField>
      </div>
      <div className="margin-top-4">
        <ApproverStatusList approverStatus={approverStatus} />
      </div>
      <div className="display-flex margin-top-4">
        <Button id={`${path}-save-continue`} className="margin-right-1" type="button" onClick={onSubmit}>
          Update report
        </Button>
      </div>
    </div>
  )
}

NeedsAction.propTypes = reviewSubmitComponentProps
