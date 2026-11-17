import { Alert, Button, Dropdown, Textarea } from '@trussworks/react-uswds';
import { APPROVER_STATUSES } from '@ttahub/common';
import moment from 'moment-timezone';
import React, { useContext, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useHistory } from 'react-router-dom';
import AppLoadingContext from '../../AppLoadingContext';
import FormItem from '../../components/FormItem';
import IndicatesRequiredField from '../../components/IndicatesRequiredField';
import { HTTPError } from '../../fetchers';
import { approveTtaRequest } from '../../fetchers/ttaRequests';
import { SELECT_PLACEHOLDER } from '../TtaRequestForm/constants';
import type { TtaRequestResponse } from '../TtaRequestForm/types';
import TtaRequestAssignmentSummary from './TtaRequestAssignmentSummary';
import TtaRequestDetails from './TtaRequestDetails';

export const APPROVAL_ERROR =
  'There was an error submitting your approval of the TTA request. Please try again later.';

export const APPROVAL_STATUS_REQUIRED = 'Choose an approval status';

const APPROVAL_STATUSES = [
  { value: APPROVER_STATUSES.NEEDS_ACTION, label: 'Needs action' },
  { value: APPROVER_STATUSES.APPROVED, label: 'Approved' },
];

interface ApprovalFormValues {
  status: string;
  note: string;
}

interface TtaRequestApprovalProps {
  ttaRequest: TtaRequestResponse;
  /** where the COR returns to once they have acted on the request */
  backLinkTo: string;
  /** the request's notes summary, shown before the approval status */
  children?: React.ReactNode;
}

/**
 * The approving COR's form for a request the reviewer sent on to them: everything on it, read
 * only, then their decision, with notes. Needs action sends the request back to its reviewer;
 * approving it creates its goals. Either way the COR returns to the list.
 */
export default function TtaRequestApproval({
  ttaRequest,
  backLinkTo,
  children = null,
}: TtaRequestApprovalProps): React.ReactElement {
  const history = useHistory();
  const [error, setError] = useState<string | null>(null);
  const { setIsAppLoading, setAppLoadingText } = useContext(AppLoadingContext) as {
    setIsAppLoading: (isLoading: boolean) => void;
    setAppLoadingText: (text: string) => void;
  };

  const hookForm = useForm<ApprovalFormValues>({
    mode: 'onSubmit',
    defaultValues: { status: '', note: '' },
  });
  const { register, handleSubmit } = hookForm;

  // the reviewer is who sent the request on, so who is asking for the COR's review
  const requester = ttaRequest.reviewer?.name ?? '';

  const onSubmit = async ({ status, note }: ApprovalFormValues) => {
    setAppLoadingText('Submitting');
    setIsAppLoading(true);

    try {
      const result: TtaRequestResponse = await approveTtaRequest(ttaRequest.id, { status, note });

      const time = moment().tz(moment.tz.guess()).format('MM/DD/YYYY [at] h:mm a z');
      history.push(backLinkTo, {
        message: {
          time,
          reportId: result.id,
          displayId: result.displayId,
          status: result.status,
          sentBackToReviewer: status === APPROVER_STATUSES.NEEDS_ACTION,
        },
      });
    } catch (e) {
      // an approval the server rejects says why, which retrying would not change
      const validationMessage =
        e instanceof HTTPError && e.status === 400 && e.data?.error ? e.data.error : null;
      setError(validationMessage || APPROVAL_ERROR);
    } finally {
      setIsAppLoading(false);
    }
  };

  return (
    // eslint-disable-next-line react/jsx-props-no-spreading
    <FormProvider {...hookForm}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <h1 className="font-serif-2xl margin-top-0 margin-bottom-1">TTA Request summary</h1>
        <IndicatesRequiredField />
        <Alert type="info" headingLevel="h4" slim className="margin-bottom-4">
          {requester} is asking for a review of this TTA request. Please view all information, then
          select an approval status.
        </Alert>
        <TtaRequestDetails ttaRequest={ttaRequest} />
        <TtaRequestAssignmentSummary ttaRequest={ttaRequest} />
        {children}
        <div className="margin-top-4">
          <FormItem label="Choose approval status" name="status" htmlFor="status">
            <Dropdown
              id="status"
              name="status"
              defaultValue=""
              inputRef={register({ required: APPROVAL_STATUS_REQUIRED })}
            >
              <option value="" disabled>
                {SELECT_PLACEHOLDER}
              </option>
              {APPROVAL_STATUSES.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Dropdown>
          </FormItem>
        </div>
        <FormItem label="Add COR notes" name="note" htmlFor="note" required={false}>
          <Textarea id="note" name="note" inputRef={register()} />
        </FormItem>
        {error && (
          <Alert
            type="error"
            headingLevel="h4"
            slim
            aria-live="polite"
            className="margin-top-4 maxw-mobile-lg"
          >
            {error}
          </Alert>
        )}
        <Button type="submit" className="margin-top-4">
          Submit
        </Button>
      </form>
    </FormProvider>
  );
}
