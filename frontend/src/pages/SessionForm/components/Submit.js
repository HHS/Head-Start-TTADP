import React from 'react';
import { Button, Dropdown, Textarea } from '@trussworks/react-uswds';
import { useFormContext } from 'react-hook-form';
import FormItem from '../../../components/FormItem';
import IncompletePages from '../../../components/IncompletePages';
import { reviewSubmitComponentProps } from './constants';
import useSessionStaff from '../../../hooks/useSessionStaff';
import { TRAINING_EVENT_ORGANIZER } from '../../../Constants';

const path = 'submitter-session-report';

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

  const { trainerOptions: approvers } = useSessionStaff(event);

  const filtered = Object.entries(pageState || {}).filter(([, status]) => status !== 'Complete').map(([position]) => Number(position));
  // eslint-disable-next-line max-len
  const incompletePages = Object.values(pages).filter((page) => filtered.includes(page.position)).map(({ label }) => label);
  const hasIncompletePages = incompletePages.length > 0;

  let approverOptions = approvers;

  if (eventOrganizer === TRAINING_EVENT_ORGANIZER.REGIONAL_PD_WITH_NATIONAL_CENTERS && facilitation === 'regional_tta_staff') {
    // format approvers and flatten national and regional trainers into a single list
    approverOptions = approvers.filter((approverGroup) => approverGroup.label === 'Regional trainers').map((group) => group.options).flat();
  }

  return (
    <div data-testid="session-form-submit">
      {!isPoc && (

        <FormItem
          label="Creator notes"
          name="additionalNotes"
          required={false}
        >
          <Textarea inputRef={register()} name="additionalNotes" id="additionalNotes" />
        </FormItem>
      )}
      {hasIncompletePages && <IncompletePages incompletePages={incompletePages} />}
      {!isPoc && (
      <FormItem
        label="Approving manager"
        name="approverId"
        required
      >
        <Dropdown
          id="approverId"
          name="approverId"
          inputRef={register()}
          required
        >
          <option disabled hidden value="">Select an approver</option>
          {approverOptions.map((approver) => (
            <option value={approver.id}>{approver.fullName}</option>
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
