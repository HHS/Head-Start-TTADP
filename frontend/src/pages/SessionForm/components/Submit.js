import React, { useContext } from 'react'
import { Button } from '@trussworks/react-uswds'
import { useFormContext } from 'react-hook-form'
import FormItem from '../../../components/FormItem'
import HookFormRichEditor from '../../../components/HookFormRichEditor'
import IncompletePages from '../../../components/IncompletePages'
import { reviewSubmitComponentProps } from './constants'
import useEventAndSessionStaff from '../../../hooks/useEventAndSessionStaff'
import { TRAINING_EVENT_ORGANIZER } from '../../../Constants'
import UserContext from '../../../UserContext'
import SingleApproverSelect from '../../../components/SingleApproverSelect'
import useCanSelectApprover from '../../../hooks/useCanSelectApprover'

const path = 'submitter-session-report'

const MANAGER_ROLES = ['ECM', 'GSM', 'TTAC']

export default function Submit({
  onSaveDraft,
  onUpdatePage,
  onSubmit,
  reviewSubmitPagePosition,
  pages,
  isPoc,
  isAdmin,
}) {
  const { watch, trigger } = useFormContext()
  const pageState = watch('pageState')
  const event = watch('event')
  const facilitation = watch('facilitation')

  // POCs can select approver when facilitation includes regional staff
  const canSelectApprover = useCanSelectApprover({ isPoc, watch })

  let eventOrganizer = ''

  if (event && event.data) {
    eventOrganizer = event.data.eventOrganizer
  }

  const { trainerOptions: approvers } = useEventAndSessionStaff(event)
  const { user } = useContext(UserContext)

  const filtered = Object.entries(pageState || {})
    .filter(([, status]) => status !== 'Complete')
    .map(([position]) => Number(position))
  // eslint-disable-next-line max-len
  const incompletePages = Object.values(pages)
    .filter((page) => filtered.includes(page.position))
    .map(({ label }) => label)
  const hasIncompletePages = incompletePages.length > 0

  let approverOptions = approvers

  if (eventOrganizer === TRAINING_EVENT_ORGANIZER.REGIONAL_TTA_NO_NATIONAL_CENTERS) {
    // eslint-disable-next-line max-len
    approverOptions = approvers.filter((o) => o.roles.some((or) => MANAGER_ROLES.includes(or.name)))
  }

  if (
    eventOrganizer === TRAINING_EVENT_ORGANIZER.REGIONAL_PD_WITH_NATIONAL_CENTERS &&
    facilitation === 'both'
  ) {
    // format approvers and flatten national and regional trainers into a single list
    approverOptions = approvers
      .filter((approverGroup) => approverGroup.label === 'Regional trainers')
      .flatMap((group) => group.options)
      .filter((o) => o.roles.some((or) => MANAGER_ROLES.includes(or.name)))
  }

  if (
    eventOrganizer === TRAINING_EVENT_ORGANIZER.REGIONAL_PD_WITH_NATIONAL_CENTERS &&
    facilitation === 'regional_tta_staff'
  ) {
    // format approvers and flatten national and regional trainers into a single list
    approverOptions = approvers.filter((o) => o.roles.some((or) => MANAGER_ROLES.includes(or.name)))
  }

  // filter current user out of approver list
  if (!isAdmin) {
    approverOptions = approverOptions.filter((a) => a.id !== user.id)
  }

  // filter out event owner from approver list (owner cannot approve their own event's sessions)
  const eventOwnerId = event?.ownerId
  if (eventOwnerId) {
    approverOptions = approverOptions.filter((a) => a.id !== eventOwnerId)
  }

  const onFormSubmit = async () => {
    const valid = await trigger()

    if (!valid || hasIncompletePages) {
      return
    }

    await onSubmit()
  }

  return (
    <div data-testid="session-form-submit">
      {canSelectApprover && (
        <FormItem label="Creator notes" name="additionalNotes" required={false}>
          <HookFormRichEditor ariaLabel="Creator notes" name="additionalNotes" />
        </FormItem>
      )}
      {hasIncompletePages && <IncompletePages incompletePages={incompletePages} />}
      {canSelectApprover && (
        <FormItem label="Approving manager" name="approver">
          <SingleApproverSelect name="approverId" options={approverOptions} />
        </FormItem>
      )}

      <div className="display-flex margin-top-4">
        <Button
          id={`${path}-save-continue`}
          className="margin-right-1"
          type="button"
          onClick={onFormSubmit}
        >
          Submit for approval
        </Button>
        <Button
          id={`${path}-save-draft`}
          className="usa-button--outline"
          type="button"
          onClick={onSaveDraft}
        >
          Save draft
        </Button>
        <Button
          id={`${path}-back`}
          outline
          type="button"
          onClick={() => {
            onUpdatePage(reviewSubmitPagePosition - 1)
          }}
        >
          Back
        </Button>
      </div>
    </div>
  )
}

Submit.propTypes = reviewSubmitComponentProps
