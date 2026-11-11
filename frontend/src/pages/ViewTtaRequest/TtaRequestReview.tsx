import { Alert, Button, Dropdown, Textarea } from '@trussworks/react-uswds';
import { APPROVER_STATUSES, TTA_REQUEST_MAX_ASSIGNED_STAFF } from '@ttahub/common';
import moment from 'moment-timezone';
import React, { useCallback, useContext, useMemo, useState } from 'react';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { useHistory } from 'react-router-dom';
import Select from 'react-select';
import AppLoadingContext from '../../AppLoadingContext';
import { DATE_DISPLAY_FORMAT } from '../../Constants';
import FormItem from '../../components/FormItem';
import MultiSelect from '../../components/MultiSelect';
import selectOptionsReset from '../../components/selectOptionsReset';
import { HTTPError } from '../../fetchers';
import {
  getTtaRequestApprovers,
  getTtaRequestAssignableStaff,
  reviewTtaRequest,
} from '../../fetchers/ttaRequests';
import useFetch from '../../hooks/useFetch';
import { SELECT_PLACEHOLDER } from '../TtaRequestForm/constants';
import type {
  SelectOption,
  TtaRequestApprovingCor,
  TtaRequestResponse,
  TtaRequestUser,
} from '../TtaRequestForm/types';

export const REVIEW_ERROR =
  'There was an error submitting your review of the TTA request. Please try again later.';

export const ASSIGN_STAFF_REQUIRED = 'Select at least one staff member';
export const ASSIGN_STAFF_MAX = `Select ${TTA_REQUEST_MAX_ASSIGNED_STAFF} or fewer staff members`;

const REVIEW_STATUSES = [
  { value: APPROVER_STATUSES.NEEDS_ACTION, label: 'Needs action' },
  { value: APPROVER_STATUSES.APPROVED, label: 'Send to COR for approval' },
];

const NO_STAFF: TtaRequestUser[] = [];
const NO_APPROVERS: TtaRequestApprovingCor[] = [];

const staffOption = ({ id, name, fullName }: TtaRequestUser): SelectOption => ({
  value: id,
  label: fullName ?? name,
});

const approverOption = ({ id, name, isBackup }: TtaRequestApprovingCor): SelectOption => ({
  value: id,
  label: isBackup ? `${name} (backup)` : name,
});

const formatDate = (date: string | null | undefined) =>
  date ? moment(date).format(DATE_DISPLAY_FORMAT) : '';

interface ReviewFormValues {
  assignedStaff: SelectOption[];
  status: string;
  approver?: SelectOption | null;
  note: string;
}

interface TtaRequestReviewProps {
  ttaRequest: TtaRequestResponse;
  /** where the reviewer returns to once they have reviewed the request */
  backLinkTo: string;
  /** the request's notes summary, shown between the date submitted and the review status */
  children?: React.ReactNode;
}

/**
 * The reviewer's part of a submitted request: the staff they assign to it, then their
 * decision, with notes. Asking for changes sends the request back to its creator, and sending
 * it to the COR sends it on for approval; either way the reviewer returns to the list.
 */
export default function TtaRequestReview({
  ttaRequest,
  backLinkTo,
  children = null,
}: TtaRequestReviewProps): React.ReactElement {
  const history = useHistory();
  const [error, setError] = useState<string | null>(null);
  const { setIsAppLoading, setAppLoadingText } = useContext(AppLoadingContext) as {
    setIsAppLoading: (isLoading: boolean) => void;
    setAppLoadingText: (text: string) => void;
  };
  const { regionId } = ttaRequest;

  const fetchStaff = useCallback(() => getTtaRequestAssignableStaff(regionId), [regionId]);
  const { data: staff } = useFetch(NO_STAFF, fetchStaff, [regionId], 'Unable to load staff.') as {
    data: TtaRequestUser[];
  };
  const staffOptions = useMemo(() => (staff || NO_STAFF).map(staffOption), [staff]);

  const fetchApprovers = useCallback(() => getTtaRequestApprovers(regionId), [regionId]);
  const { data: approvers } = useFetch(
    NO_APPROVERS,
    fetchApprovers,
    [regionId],
    'Unable to load approving CORs.'
  ) as { data: TtaRequestApprovingCor[] };
  const approverOptions = useMemo(
    () => (approvers || NO_APPROVERS).map(approverOption),
    [approvers]
  );

  const hookForm = useForm<ReviewFormValues>({
    mode: 'onBlur',
    defaultValues: {
      // the staff assigned on an earlier review are assigned again unless the reviewer changes them
      assignedStaff: (ttaRequest.assignedStaff ?? []).map(staffOption),
      status: '',
      note: '',
    },
  });
  const { register, handleSubmit, control, watch } = hookForm;
  const sendingToCor = watch('status') === APPROVER_STATUSES.APPROVED;

  const onSubmit = async ({ assignedStaff, status, approver, note }: ReviewFormValues) => {
    setAppLoadingText('Submitting');
    setIsAppLoading(true);

    try {
      const reviewed: TtaRequestResponse = await reviewTtaRequest(ttaRequest.id, {
        status,
        note,
        assignedStaffIds: assignedStaff.map(({ value }) => value),
        ...(status === APPROVER_STATUSES.APPROVED ? { approverId: approver?.value } : {}),
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
    } catch (e) {
      // a review the server rejects says why, which retrying would not change
      const validationMessage =
        e instanceof HTTPError && e.status === 400 && e.data?.error ? e.data.error : null;
      setError(validationMessage || REVIEW_ERROR);
    } finally {
      setIsAppLoading(false);
    }
  };

  return (
    // eslint-disable-next-line react/jsx-props-no-spreading
    <FormProvider {...hookForm}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <h2 className="font-serif-lg margin-top-4 margin-bottom-3">TTA assignment</h2>
        <FormItem label="Assign staff" name="assignedStaff">
          <div className="maxw-mobile-lg">
            <MultiSelect
              name="assignedStaff"
              control={control}
              options={staffOptions}
              simple={false}
              placeholderText={SELECT_PLACEHOLDER}
              // a required select would have the browser block the submission before these
              // rules can say what is missing, so they check for none as well
              required={false}
              rules={{
                validate: (value: SelectOption[]) => {
                  if (!value || !value.length) {
                    return ASSIGN_STAFF_REQUIRED;
                  }
                  return value.length <= TTA_REQUEST_MAX_ASSIGNED_STAFF || ASSIGN_STAFF_MAX;
                },
              }}
            />
          </div>
        </FormItem>
        <h2 className="font-serif-lg margin-top-4 margin-bottom-3">Review and submit</h2>
        <dl className="margin-top-0 margin-bottom-3">
          <dt className="text-bold">Date submitted</dt>
          <dd className="margin-0">{formatDate(ttaRequest.submittedAt)}</dd>
        </dl>
        {children}
        <div className="margin-top-4">
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
        </div>
        {sendingToCor && (
          <Controller
            name="approver"
            control={control}
            rules={{ required: 'Select an approving COR' }}
            defaultValue={null}
            render={({ value, onChange, onBlur }) => (
              <FormItem label="Approving COR" name="approver" htmlFor="approver">
                <Select
                  inputId="approver"
                  name="approver"
                  className="usa-select"
                  styles={selectOptionsReset}
                  options={approverOptions}
                  placeholder={SELECT_PLACEHOLDER}
                  value={value}
                  onChange={onChange}
                  onBlur={onBlur}
                  isClearable
                />
              </FormItem>
            )}
          />
        )}
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
