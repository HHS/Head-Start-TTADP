import { Textarea } from '@trussworks/react-uswds';
import React, { useCallback, useMemo } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import Select from 'react-select';
import FormItem from '../../components/FormItem';
import selectOptionsReset from '../../components/selectOptionsReset';
import { getApprovers } from '../../fetchers/activityReports';
import useFetch from '../../hooks/useFetch';
import { SELECT_PLACEHOLDER, TTA_REQUEST_FIELDS } from './constants';
import type { Approver, SelectOption } from './types';

const NO_APPROVERS: Approver[] = [];

interface SubmitForReviewProps {
  /** the region whose approvers can review this request, or null until a grant is chosen */
  regionId: number | null;
}

/**
 * Notes for whoever picks the request up, and the person who will review it. The reviewers
 * are the region's activity report approvers, so there is nothing to choose from until the
 * grant - and with it the region - is known.
 */
export default function SubmitForReview({ regionId }: SubmitForReviewProps): React.ReactElement {
  const { control, register } = useFormContext();

  // there is no region to ask about until a grant has been picked, so ask for nobody
  const fetcher = useCallback(
    async () => (regionId ? getApprovers(regionId) : NO_APPROVERS),
    [regionId]
  );
  const { data: availableApprovers } = useFetch(
    NO_APPROVERS,
    fetcher,
    [regionId],
    'Unable to load reviewers.'
  );

  const approvers: SelectOption[] = useMemo(
    () =>
      (availableApprovers || []).map((approver) => ({ value: approver.id, label: approver.name })),
    [availableApprovers]
  );

  return (
    <>
      <h3 className="margin-top-4 margin-bottom-2">Submit for review</h3>
      <FormItem
        label="Add creator notes"
        name={TTA_REQUEST_FIELDS.CREATOR_NOTES}
        htmlFor={TTA_REQUEST_FIELDS.CREATOR_NOTES}
        required={false}
      >
        <Textarea
          id={TTA_REQUEST_FIELDS.CREATOR_NOTES}
          name={TTA_REQUEST_FIELDS.CREATOR_NOTES}
          inputRef={register()}
        />
      </FormItem>
      <Controller
        name={TTA_REQUEST_FIELDS.REVIEWER}
        control={control}
        rules={{ required: 'Select a reviewing TTAC or manager' }}
        defaultValue={null}
        render={({ value, onChange, onBlur }) => (
          <FormItem
            label="Reviewing TTAC or manager"
            name={TTA_REQUEST_FIELDS.REVIEWER}
            htmlFor={TTA_REQUEST_FIELDS.REVIEWER}
            required
          >
            <Select
              inputId={TTA_REQUEST_FIELDS.REVIEWER}
              name={TTA_REQUEST_FIELDS.REVIEWER}
              className="usa-select"
              styles={selectOptionsReset}
              options={approvers}
              placeholder={SELECT_PLACEHOLDER}
              value={value}
              onChange={onChange}
              onBlur={onBlur}
              isClearable
            />
          </FormItem>
        )}
      />
    </>
  );
}
