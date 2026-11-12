import { Alert, Button, Dropdown, Textarea } from '@trussworks/react-uswds';
import { APPROVER_STATUSES, TTA_REQUEST_MAX_ASSIGNED_STAFF } from '@ttahub/common';
import moment from 'moment-timezone';
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { useHistory } from 'react-router-dom';
import Select from 'react-select';
import AppLoadingContext from '../../AppLoadingContext';
import { DATE_DISPLAY_FORMAT } from '../../Constants';
import FormItem from '../../components/FormItem';
import IndicatesRequiredField from '../../components/IndicatesRequiredField';
import MultiSelect from '../../components/MultiSelect';
import selectOptionsReset from '../../components/selectOptionsReset';
import { nameWithRole } from '../../components/TtaRequestNotesSummary/notes';
import { HTTPError } from '../../fetchers';
import { getTtaRequestRecipientAndGrantsByUser } from '../../fetchers/recipient';
import {
  getTtaRequestApprovers,
  getTtaRequestAssignableStaff,
  reviewTtaRequest,
  saveTtaRequest,
} from '../../fetchers/ttaRequests';
import useFetch from '../../hooks/useFetch';
import { canReviewerEditTtaRequest } from '../../permissions';
import UserContext from '../../UserContext';
import { SELECT_PLACEHOLDER, TTA_REQUEST_FIELDS } from '../TtaRequestForm/constants';
import { grantIdsKey, toApiPayload, toFormValues } from '../TtaRequestForm/formData';
import GoalAndContext from '../TtaRequestForm/GoalAndContext';
import type {
  SelectOption,
  TtaRequestApprovingCor,
  TtaRequestFormValues,
  TtaRequestRecipient,
  TtaRequestResponse,
  TtaRequestUser,
} from '../TtaRequestForm/types';
import WhoIsTheRequestFor from '../TtaRequestForm/WhoIsTheRequestFor';
import TtaRequestDetails from './TtaRequestDetails';

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

/** the request's own details, which the reviewer can edit, then their review of it */
interface ReviewFormValues extends TtaRequestFormValues {
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
 * The reviewer's form for a submitted request: its details, which they can edit in place, the
 * staff they assign to it, then their decision, with notes. Asking for changes sends the
 * request back to its creator, and sending it to the COR sends it on for approval; either way
 * the reviewer returns to the list.
 *
 * Edits to the details are saved along with the review, so it is one form: nothing the
 * reviewer has filled in is lost as they move between its parts. The recipient is the
 * creator's, so it can't be changed, but the reviewer can choose among its grants.
 */
export default function TtaRequestReview({
  ttaRequest,
  backLinkTo,
  children = null,
}: TtaRequestReviewProps): React.ReactElement {
  const history = useHistory();
  const { user } = useContext(UserContext);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
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

  // the request's details as the form holds them, with the grants it was submitted for
  const details = useMemo(() => toFormValues(ttaRequest), [ttaRequest]);

  const hookForm = useForm<ReviewFormValues>({
    mode: 'onBlur',
    // a part of the form that isn't shown - the details before they are edited, or the COR
    // when the review status changes - keeps its values rather than losing them
    shouldUnregister: false,
    defaultValues: {
      ...details,
      // the staff assigned on an earlier review are assigned again unless the reviewer changes them
      assignedStaff: (ttaRequest.assignedStaff ?? []).map(staffOption),
      status: '',
      note: '',
    },
  });
  const { register, handleSubmit, control, watch, getValues, setValue } = hookForm;
  const sendingToCor = watch('status') === APPROVER_STATUSES.APPROVED;

  // every grant the recipient could choose is only known once the details are being edited,
  // from the same list the request form offers
  const fetchRecipients = useCallback(
    () => (isEditing ? getTtaRequestRecipientAndGrantsByUser() : Promise.resolve(null)),
    [isEditing]
  );
  const { data: recipients } = useFetch(
    null,
    fetchRecipients,
    [isEditing],
    'Unable to load recipients.'
  ) as { data: TtaRequestRecipient[] | null };
  const recipient = useMemo(() => {
    if (!recipients) {
      return null;
    }
    return recipients.find(({ id }) => id === details.recipient?.id) ?? details.recipient;
  }, [recipients, details]);

  // the recipient's option lists every grant they could choose, so it stands in for the
  // request's own recipient, which only has the grants already chosen
  useEffect(() => {
    if (recipient) {
      setValue(TTA_REQUEST_FIELDS.RECIPIENT, recipient);
    }
  }, [recipient, setValue]);

  // the goal and its citations belong to the grants, so they don't survive a change of grant
  const grantKey = grantIdsKey(watch(TTA_REQUEST_FIELDS.GRANTS) ?? []);
  const previousGrantKey = useRef(grantKey);
  useEffect(() => {
    if (previousGrantKey.current === grantKey) {
      return;
    }
    previousGrantKey.current = grantKey;
    setValue(TTA_REQUEST_FIELDS.GOAL, null);
    setValue(TTA_REQUEST_FIELDS.CITATIONS, []);
  }, [grantKey, setValue]);

  const onSubmit = async ({ assignedStaff, status, approver, note }: ReviewFormValues) => {
    setAppLoadingText('Submitting');
    setIsAppLoading(true);

    try {
      if (isEditing) {
        // who the request is for, who reviews it and the creator's notes stay the creator's
        const {
          recipientId: _recipientId,
          reviewerId: _reviewerId,
          creatorNotes: _creatorNotes,
          ...changes
        } = toApiPayload(getValues());
        await saveTtaRequest(ttaRequest.id, changes);
      }

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
        <h1 className="font-serif-2xl margin-top-0 margin-bottom-1">TTA Request summary</h1>
        <IndicatesRequiredField />
        <Alert type="info" headingLevel="h4" slim className="margin-bottom-4">
          {nameWithRole(ttaRequest.creator)} is asking for a review of this TTA request. Please view
          all information, then assign a specialist and select a review status.
        </Alert>
        {isEditing && recipient ? (
          <>
            {/* a fixed recipient isn't offered for change, only their grants */}
            <WhoIsTheRequestFor recipient={recipient} recipientOptions={[recipient]} />
            <GoalAndContext regionId={ttaRequest.regionId} />
          </>
        ) : (
          <TtaRequestDetails
            ttaRequest={ttaRequest}
            onEdit={
              !isEditing && canReviewerEditTtaRequest(user, ttaRequest)
                ? () => setIsEditing(true)
                : null
            }
          />
        )}
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
