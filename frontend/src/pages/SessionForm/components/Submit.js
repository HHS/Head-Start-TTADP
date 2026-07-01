import { Button } from '@trussworks/react-uswds';
import React from 'react';
import { useFormContext } from 'react-hook-form';

import FormItem from '../../../components/FormItem';
import HookFormRichEditor from '../../../components/HookFormRichEditor';
import IncompletePages from '../../../components/IncompletePages';
import SingleApproverSelect from '../../../components/SingleApproverSelect';
import useCanSelectApprover from '../../../hooks/useCanSelectApprover';
import useSessionApprovers from '../../../hooks/useSessionApprovers';
import { reviewSubmitComponentProps } from './constants';

const path = 'submitter-session-report';

export default function Submit({
  onSaveDraft,
  onUpdatePage,
  onSubmit,
  reviewSubmitPagePosition,
  pages,
  isPoc,
  isAdmin,
}) {
  const { watch, trigger } = useFormContext();
  const pageState = watch('pageState');

  // POCs can select approver when facilitation includes regional staff
  const canSelectApprover = useCanSelectApprover({ isPoc, watch });

  const approverOptions = useSessionApprovers({ watch, isAdmin });

  const filtered = Object.entries(pageState || {})
    .filter(([, status]) => status !== 'Complete')
    .map(([position]) => Number(position));
  // eslint-disable-next-line max-len
  const incompletePages = Object.values(pages)
    .filter((page) => filtered.includes(page.position))
    .map(({ label }) => label);
  const hasIncompletePages = incompletePages.length > 0;

  const onFormSubmit = async () => {
    const valid = await trigger();

    if (!valid || hasIncompletePages) {
      return;
    }

    await onSubmit();
  };

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
            onUpdatePage(reviewSubmitPagePosition - 1);
          }}
        >
          Back
        </Button>
      </div>
    </div>
  );
}

Submit.propTypes = reviewSubmitComponentProps;
