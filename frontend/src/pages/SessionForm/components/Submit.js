import React from 'react';
import { Button, Dropdown, Textarea } from '@trussworks/react-uswds';
import { useFormContext } from 'react-hook-form';
import FormItem from '../../../components/FormItem';
import IncompletePages from '../../../components/IncompletePages';
import pages from '../pages';
import { reviewSubmitComponentProps, REVIEW_SUBMIT_POSITION } from './constants';

const path = 'submitter-session-report';

export default function Submit({ onSaveDraft, onUpdatePage, onSubmit }) {
  const { register, watch } = useFormContext();
  const pageState = watch('pageState');

  const filtered = Object.entries(pageState || {}).filter(([, status]) => status !== 'Complete').map(([position]) => Number(position));
  // eslint-disable-next-line max-len
  const incompletePages = Object.values(pages).filter((page) => filtered.includes(page.position)).map(({ label }) => label);
  const hasIncompletePages = incompletePages.length > 0;

  return (
    <div data-testid="session-form-submit">
      <FormItem
        label="Creator notes"
        name="additionalNotes"
        required={false}
      >
        <Textarea inputRef={register()} name="additionalNotes" id="additionalNotes" />
      </FormItem>
      {hasIncompletePages && <IncompletePages incompletePages={incompletePages} />}
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
          {/* todo: populate available approvers */}
          <option value={5}>Cucumber User</option>
        </Dropdown>
      </FormItem>
      <div className="display-flex margin-top-4">
        <Button id={`${path}-save-continue`} className="margin-right-1" type="button" onClick={onSubmit}>Submit for approval</Button>
        <Button id={`${path}-save-draft`} className="usa-button--outline" type="button" onClick={onSaveDraft}>Save draft</Button>
        <Button id={`${path}-back`} outline type="button" onClick={() => { onUpdatePage(REVIEW_SUBMIT_POSITION - 1); }}>Back</Button>
      </div>
    </div>
  );
}

Submit.propTypes = reviewSubmitComponentProps;
