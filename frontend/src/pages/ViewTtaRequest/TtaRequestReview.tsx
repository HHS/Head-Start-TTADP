import { Alert, Button, Dropdown, Textarea } from '@trussworks/react-uswds';
import { TTA_REQUEST_STATUSES } from '@ttahub/common';
import moment from 'moment-timezone';
import React, { useContext, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useHistory } from 'react-router-dom';
import AppLoadingContext from '../../AppLoadingContext';
import FormItem from '../../components/FormItem';
import { reviewTtaRequest } from '../../fetchers/ttaRequests';
import { SELECT_PLACEHOLDER } from '../TtaRequestForm/constants';
import type { TtaRequestResponse } from '../TtaRequestForm/types';

export const REVIEW_ERROR =
  'There was an error submitting your review of the TTA request. Please try again later.';

// needs action is the only review there is until requests can be sent on for approval
const REVIEW_STATUSES = [{ value: TTA_REQUEST_STATUSES.NEEDS_ACTION, label: 'Needs action' }];

interface ReviewFormValues {
  status: string;
  note: string;
}

interface TtaRequestReviewProps {
  ttaRequest: TtaRequestResponse;
  /** where the reviewer returns to once they have reviewed the request */
  backLinkTo: string;
}

/**
 * The reviewer's decision on a submitted request, with notes for its creator. Asking for
 * changes sends the request back to the creator, so the reviewer returns to the list.
 */
export default function TtaRequestReview({
  ttaRequest,
  backLinkTo,
}: TtaRequestReviewProps): React.ReactElement {
  const history = useHistory();
  const [error, setError] = useState<string | null>(null);
  const { setIsAppLoading, setAppLoadingText } = useContext(AppLoadingContext) as {
    setIsAppLoading: (isLoading: boolean) => void;
    setAppLoadingText: (text: string) => void;
  };

  const hookForm = useForm<ReviewFormValues>({
    mode: 'onBlur',
    defaultValues: { status: '', note: '' },
  });
  const { register, handleSubmit } = hookForm;

  const onSubmit = async ({ status, note }: ReviewFormValues) => {
    setAppLoadingText('Submitting');
    setIsAppLoading(true);

    try {
      const reviewed: TtaRequestResponse = await reviewTtaRequest(ttaRequest.id, {
        status,
        note,
      });

      const time = moment().tz(moment.tz.guess()).format('MM/DD/YYYY [at] h:mm a z');
      history.push(backLinkTo, {
        message: {
          time,
          reportId: reviewed.id,
          displayId: reviewed.displayId,
          status: reviewed.status,
        },
      });
    } catch {
      setError(REVIEW_ERROR);
    } finally {
      setIsAppLoading(false);
    }
  };

  return (
    // eslint-disable-next-line react/jsx-props-no-spreading
    <FormProvider {...hookForm}>
      <form onSubmit={handleSubmit(onSubmit)} className="margin-top-4">
        <FormItem label="Choose review status" name="status" htmlFor="status">
          <Dropdown
            id="status"
            name="status"
            defaultValue=""
            inputRef={register({ required: 'Choose a review status' })}
          >
            <option value="" disabled>
              {SELECT_PLACEHOLDER}
            </option>
            {REVIEW_STATUSES.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Dropdown>
        </FormItem>
        <FormItem label="Add TTAC or Manager notes" name="note" htmlFor="note" required={false}>
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
