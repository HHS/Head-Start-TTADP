import { Button, Textarea } from '@trussworks/react-uswds';
import React, { useCallback, useMemo } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import Select from 'react-select';
import FormItem from '../../../components/FormItem';
import IndicatesRequiredField from '../../../components/IndicatesRequiredField';
import selectOptionsReset from '../../../components/selectOptionsReset';
import { getApprovers } from '../../../fetchers/activityReports';
import useFetch from '../../../hooks/useFetch';
import { HookFormLike, pageComplete, SELECT_PLACEHOLDER, TTA_REQUEST_FIELDS } from '../constants';
import type { Approver, SelectOption, TtaRequestAdditionalData, TtaRequestPage } from '../types';

const NO_APPROVERS: Approver[] = [];

interface SubmitForReviewFieldsProps {
  /** the region whose approvers can review this request, or null until a grant is chosen */
  regionId: number | null;
}

/**
 * Notes for whoever picks the request up, and the person who will review it. The reviewers
 * are the region's activity report approvers, so there is nothing to choose from until the
 * grant - and with it the region - is known.
 */
export function SubmitForReviewFields({ regionId }: SubmitForReviewFieldsProps): React.ReactElement {
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
      <IndicatesRequiredField />
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

const path = 'submit-for-review';
const position = 3;
const fields = [TTA_REQUEST_FIELDS.REVIEWER];

export const isPageComplete = (hookForm: HookFormLike): boolean => pageComplete(hookForm, fields);

const submitForReview: TtaRequestPage = {
  position,
  label: 'Submit for review',
  path,
  review: false,
  fields,
  isPageComplete,
  render: (
    additionalData,
    _formData,
    _reportId,
    isAppLoading,
    _onContinue,
    _onSaveDraft,
    onUpdatePage,
    _weAreAutoSaving,
    _datePickerKey,
    onFormSubmit,
    BAlert
  ) => {
    const { regionId } = additionalData as TtaRequestAdditionalData;
    return (
      <div className="padding-x-1">
        <SubmitForReviewFields regionId={regionId} />
        <BAlert />
        <div className="display-flex margin-top-4">
          <Button
            id={`${path}-submit`}
            className="margin-right-1"
            type="button"
            disabled={isAppLoading}
            onClick={onFormSubmit}
          >
            Submit
          </Button>
          <Button
            id={`${path}-back`}
            outline
            type="button"
            disabled={isAppLoading}
            onClick={() => onUpdatePage(position - 1)}
          >
            Back
          </Button>
        </div>
      </div>
    );
  },
};

export default submitForReview;
