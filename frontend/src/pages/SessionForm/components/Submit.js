import React from 'react';
import { Button, Dropdown, Textarea } from '@trussworks/react-uswds';
import { useFormContext } from 'react-hook-form';
import FormItem from '../../../components/FormItem';
import IncompletePages from '../../../components/IncompletePages';
import { reviewSubmitComponentProps } from './constants';
import useEventAndSessionStaff from '../../../hooks/useEventAndSessionStaff';
import { TRAINING_EVENT_ORGANIZER } from '../../../Constants';

const path = 'submitter-session-report';

const MANAGER_ROLES = [
  'ECM',
  'GSM',
];

export default function Submit({
  onSaveDraft,
  onUpdatePage,
  onSubmit,
  reviewSubmitPagePosition,
  pages,
  isPoc,
}) {
  const { register, watch } = useFormContext();
  const pageState = watch('pageState');
  const event = watch('event');

  const facilitation = watch('facilitation');
  let eventOrganizer = '';

  if (event && event.data) {
    eventOrganizer = event.data.eventOrganizer;
  }

  const { trainerOptions: approvers } = useEventAndSessionStaff(event);

  const filtered = Object.entries(pageState || {}).filter(([, status]) => status !== 'Complete').map(([position]) => Number(position));
  // eslint-disable-next-line max-len
  const incompletePages = Object.values(pages).filter((page) => filtered.includes(page.position)).map(({ label }) => label);
  const hasIncompletePages = incompletePages.length > 0;

  let approverOptions = approvers;

  if (eventOrganizer === TRAINING_EVENT_ORGANIZER.REGIONAL_TTA_NO_NATIONAL_CENTERS) {
    // eslint-disable-next-line max-len
    approverOptions = approvers.filter((o) => o.roles.some((or) => MANAGER_ROLES.includes(or.name)));
  }

  if (eventOrganizer === TRAINING_EVENT_ORGANIZER.REGIONAL_PD_WITH_NATIONAL_CENTERS && (facilitation === 'regional_tta_staff' || facilitation === 'both')) {
    // format approvers and flatten national and regional trainers into a single list
    approverOptions = approvers
      .filter((approverGroup) => approverGroup.label === 'Regional trainers')
      .flatMap((group) => group.options)
      .filter((o) => o.roles.some((or) => MANAGER_ROLES.includes(or.name)));
  }

  // POCs can select approver when facilitation includes regional staff
  const facilitationIncludesRegion = facilitation === 'regional_tta_staff' || facilitation === 'both';
  const canSelectApprover = !isPoc || (isPoc && facilitationIncludesRegion);

  return (
    <div data-testid="session-form-submit">
      {canSelectApprover && (

        <FormItem
          label="Creator notes"
          name="additionalNotes"
          required={false}
        >
          <Textarea inputRef={register()} name="additionalNotes" id="additionalNotes" />
        </FormItem>
      )}
      {hasIncompletePages && <IncompletePages incompletePages={incompletePages} />}
      {canSelectApprover && (
      <FormItem
        label="Approving manager"
        name="approverId"
        required
      >
        <Dropdown
          id="approverId"
          name="approverId"
          data-testid="approver"
          inputRef={register({ required: 'Select an approver' })}
          required
        >
          <option selected value="">Select an approver</option>
          {approverOptions.map((approver) => (
            <option key={approver.id} value={approver.id}>{approver.fullName}</option>
          ))}
        </Dropdown>
      </FormItem>
      )}

      <div className="display-flex margin-top-4">
        <Button id={`${path}-save-continue`} className="margin-right-1" type="button" onClick={onSubmit}>Submit for approval</Button>
        <Button id={`${path}-save-draft`} className="usa-button--outline" type="button" onClick={onSaveDraft}>Save draft</Button>
        <Button id={`${path}-back`} outline type="button" onClick={() => { onUpdatePage(reviewSubmitPagePosition - 1); }}>Back</Button>
      </div>
    </div>
  );
}

Submit.propTypes = reviewSubmitComponentProps;
