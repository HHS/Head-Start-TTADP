import { Textarea } from '@trussworks/react-uswds';
import React, { useCallback, useEffect, useMemo } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import Select from 'react-select';
import FormItem from '../../components/FormItem';
import selectOptionsReset from '../../components/selectOptionsReset';
import { getTtaRequestReviewers } from '../../fetchers/ttaRequests';
import useFetch from '../../hooks/useFetch';
import { SELECT_PLACEHOLDER, TTA_REQUEST_FIELDS } from './constants';
import type { Reviewer, SelectOption } from './types';

const NO_REVIEWERS: Reviewer[] = [];

export const INELIGIBLE_REVIEWER_ERROR =
  'The previously selected reviewer can no longer review TTA requests in this region. Select another reviewer.';

interface RegionReviewers {
  regionId: number | null;
  reviewers: Reviewer[];
}

const NO_REGION_REVIEWERS: RegionReviewers = { regionId: null, reviewers: NO_REVIEWERS };

interface SubmitForReviewProps {
  /** the region whose reviewers can review this request, or null until a grant is chosen */
  regionId: number | null;
}

/**
 * Notes for whoever picks the request up, and the person who will review it. The reviewers
 * are the region's users who can review, approve or backup approve TTA requests, so there
 * is nothing to choose from until the grant - and with it the region - is known.
 */
export default function SubmitForReview({ regionId }: SubmitForReviewProps): React.ReactElement {
  const { control, register, watch, setValue, setError } = useFormContext();

  // there is no region to ask about until a grant has been picked, so ask for nobody. The
  // reviewers are kept with their region, so a list from the previous region is never
  // mistaken for this one's while it loads.
  const fetcher = useCallback(
    async (): Promise<RegionReviewers> => ({
      regionId,
      reviewers: regionId ? await getTtaRequestReviewers(regionId) : NO_REVIEWERS,
    }),
    [regionId]
  );
  const { data: regionReviewers, error: reviewersError } = useFetch(
    NO_REGION_REVIEWERS,
    fetcher,
    [regionId],
    'Unable to load reviewers.'
  );

  const reviewers: SelectOption[] = useMemo(
    () =>
      (regionReviewers.reviewers || []).map((reviewer) => ({
        value: reviewer.id,
        label: reviewer.name,
      })),
    [regionReviewers]
  );

  // a saved draft keeps its reviewer even if they can no longer review in the region, and
  // the server would refuse to submit it, so drop them once the region's reviewers are known
  const selectedReviewer = watch(TTA_REQUEST_FIELDS.REVIEWER) as SelectOption | null;
  const reviewersLoaded = !!regionId && regionReviewers.regionId === regionId && !reviewersError;
  useEffect(() => {
    if (!reviewersLoaded || !selectedReviewer) {
      return;
    }
    if (!reviewers.some((option) => option.value === selectedReviewer.value)) {
      setValue(TTA_REQUEST_FIELDS.REVIEWER, null, { shouldDirty: true });
      setError(TTA_REQUEST_FIELDS.REVIEWER, {
        type: 'manual',
        message: INELIGIBLE_REVIEWER_ERROR,
      });
    }
  }, [reviewersLoaded, reviewers, selectedReviewer, setValue, setError]);

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
              options={reviewers}
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
