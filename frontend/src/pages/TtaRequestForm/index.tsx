import { Alert, Button } from '@trussworks/react-uswds';
import useInterval from '@use-it/interval';
import { isEqual } from 'lodash';
import moment from 'moment';
import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet';
import { FormProvider, useForm } from 'react-hook-form';
import { useHistory, useLocation, useParams } from 'react-router-dom';
import AppLoadingContext from '../../AppLoadingContext';
import Container from '../../components/Container';
import DismissingComponentWrapper from '../../components/DismissingComponentWrapper';
import IndicatesRequiredField from '../../components/IndicatesRequiredField';
import { createTtaRequest, getTtaRequest, saveTtaRequest } from '../../fetchers/ttaRequests';
import useFetch from '../../hooks/useFetch';
import { shouldUpdateFormData } from '../../utils/formRichTextEditorHelper';
import {
  AUTOSAVE_INTERVAL,
  DATE_DISPLAY_SAVED_FORMAT,
  defaultValues,
  LOAD_ERROR,
  NO_REGION_ERROR,
  SAVE_ERROR,
  TTA_REQUEST_FIELDS,
} from './constants';
import { toApiPayload, toFormValues } from './formData';
import GoalAndContext from './GoalAndContext';
import SubmitForReview from './SubmitForReview';
import TtaRequestFormHeading from './TtaRequestFormHeading';
import type {
  TtaRequestFormValues,
  TtaRequestGrant,
  TtaRequestRecipient,
  TtaRequestResponse,
} from './types';
import WhoIsTheRequestFor from './WhoIsTheRequestFor';

interface TtaRequestFormProps {
  /** set when the request was started from a recipient's TTA records */
  recipient?: TtaRequestRecipient | null;
  /** every recipient the user can pick from, when started from the TTA requests page */
  recipientOptions?: TtaRequestRecipient[] | null;
  /** the region of the recipient's record, when there is one */
  regionId?: number | null;
  /** where the back link and a finished request return the user to */
  backLinkTo: string;
}

const grantIdsKey = (grants: TtaRequestGrant[]) => grants.map((grant) => grant.id).join(',');

/**
 * The TTA request form. Both entry points - a recipient's TTA records and the TTA requests
 * page - render this, differing only in whether the recipient arrives fixed or is chosen here.
 *
 * A draft is saved as it stands, by the Save draft button and on an interval. The first save
 * of a new request creates it and puts its id in the URL, so later saves update it.
 *
 * TODO: submitting validates and navigates but does not persist yet; that is its own ticket.
 */
export default function TtaRequestForm(props: TtaRequestFormProps): React.ReactElement {
  const { ttaRequestId } = useParams<{ ttaRequestId?: string }>();
  // the router reuses the form when the route moves to another draft, so each draft gets its
  // own form and nothing - least of all the request it saves to - carries over from the last
  return <TtaRequestFormBody key={ttaRequestId ?? 'new'} {...props} />;
}

function TtaRequestFormBody({
  recipient = null,
  recipientOptions = null,
  regionId = null,
  backLinkTo,
}: TtaRequestFormProps): React.ReactElement {
  const history = useHistory();
  const location = useLocation();
  const { ttaRequestId: ttaRequestIdParam } = useParams<{ ttaRequestId?: string }>();
  // an autosave says so; saving by hand says the draft was saved, as the activity report does
  const [lastAutoSaveTime, setLastAutoSaveTime] = useState<moment.Moment | null>(null);
  const [lastSaveTime, setLastSaveTime] = useState<moment.Moment | null>(null);
  const [showSavedDraft, updateShowSavedDraft] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  // this is used to disable the save button (we don't use the overlay on auto save)
  const [weAreAutoSaving, setWeAreAutoSaving] = useState(false);
  const { isAppLoading, setIsAppLoading, setAppLoadingText } = useContext(AppLoadingContext) as {
    isAppLoading: boolean;
    setIsAppLoading: (isLoading: boolean) => void;
    setAppLoadingText: (text: string) => void;
  };

  // only a "new" route starts a request; any other id must load one, or say it can't
  const isNewRequest = ttaRequestIdParam === undefined || ttaRequestIdParam === 'new';
  const parsedRouteId = isNewRequest ? null : Number(ttaRequestIdParam);
  const routeId =
    parsedRouteId !== null && Number.isSafeInteger(parsedRouteId) && parsedRouteId > 0
      ? parsedRouteId
      : null;
  // the id of the request being edited, from the route or from this form's first save
  const ttaRequestIdRef = useRef<number | null>(routeId);

  const hookForm = useForm({
    mode: 'onBlur',
    defaultValues: {
      ...defaultValues,
      [TTA_REQUEST_FIELDS.RECIPIENT]: recipient,
    },
  });

  const { getValues, reset, setValue, watch, formState } = hookForm;
  // read while rendering, so react-hook-form tracks it
  const { isDirty } = formState;

  const fetchSavedRequest = useCallback(async (): Promise<TtaRequestResponse | null> => {
    if (routeId === null) {
      return null;
    }
    return getTtaRequest(routeId);
  }, [routeId]);

  const { data: savedRequest, error: loadError } = useFetch(
    null,
    fetchSavedRequest,
    [routeId],
    LOAD_ERROR,
    true
  );

  // a saved draft keeps its own recipient, whichever record's link it was opened from
  useEffect(() => {
    if (recipient && (!savedRequest || savedRequest.recipient?.id === recipient.id)) {
      setValue(TTA_REQUEST_FIELDS.RECIPIENT, recipient);
    }
  }, [recipient, savedRequest, setValue]);

  const selectedGrants: TtaRequestGrant[] = watch(TTA_REQUEST_FIELDS.GRANTS);

  // the region follows the grants, which is what the goals, citations and approvers hang off.
  // A saved draft's region is fixed, whichever record's link it was opened from.
  const effectiveRegionId =
    savedRequest?.regionId ?? regionId ?? selectedGrants[0]?.regionId ?? null;

  // goals belong to grants and approvers to a region, so neither survives a change of grant
  const grantKey = grantIdsKey(selectedGrants);
  const previousGrantKey = useRef(grantKey);

  // fill the form from a saved draft. Its grants are where it left off, not a change of
  // grant, so they mustn't clear the goal and reviewer that came with them.
  // biome-ignore lint/correctness/useExhaustiveDependencies: the recipient options are matched up below as they arrive, and must not refill the form
  useEffect(() => {
    if (!savedRequest) {
      return;
    }
    previousGrantKey.current = grantIdsKey(savedRequest.grants);
    reset(toFormValues(savedRequest, recipientOptions ?? []));
  }, [savedRequest, reset]);

  // only the recipient's option lists every grant they could choose, so swap it in once the
  // options load after the draft
  const selectedRecipient: TtaRequestRecipient | null = watch(TTA_REQUEST_FIELDS.RECIPIENT);
  useEffect(() => {
    const option = recipientOptions?.find(({ id }) => id === selectedRecipient?.id);
    if (option && option !== selectedRecipient) {
      setValue(TTA_REQUEST_FIELDS.RECIPIENT, option);
    }
  }, [recipientOptions, selectedRecipient, setValue]);
  useEffect(() => {
    if (previousGrantKey.current === grantKey) {
      return;
    }
    previousGrantKey.current = grantKey;
    setValue(TTA_REQUEST_FIELDS.GOAL, null);
    setValue(TTA_REQUEST_FIELDS.CITATIONS, []);
    setValue(TTA_REQUEST_FIELDS.REVIEWER, null);
  }, [grantKey, setValue]);

  /**
   * A draft is saved as it stands, so this deliberately sidesteps validation. The form is then
   * reset to what was saved, as the activity report does, which clears its dirty state so an
   * autosave only follows a change - unless an autosave would throw the cursor out of the
   * rich text editor mid-sentence.
   */
  const onSaveDraft = async (isAutoSave = false) => {
    const ttaRequestId = ttaRequestIdRef.current;

    // a new request needs its region, which comes from the grant until one is chosen
    if (ttaRequestId === null && !effectiveRegionId) {
      if (!isAutoSave) {
        setSaveError(NO_REGION_ERROR);
      }
      return;
    }

    if (!isAutoSave && !isAppLoading) {
      setAppLoadingText('Saving');
      setIsAppLoading(true);
    }

    try {
      const payload = toApiPayload(getValues() as TtaRequestFormValues);

      let saved: TtaRequestResponse;
      if (ttaRequestId !== null) {
        saved = await saveTtaRequest(ttaRequestId, payload);
      } else {
        saved = await createTtaRequest({ ...payload, regionId: effectiveRegionId });
        ttaRequestIdRef.current = saved.id;
        window.history.replaceState(
          null,
          null,
          location.pathname.replace(/\/new\/?$/, `/${saved.id}`)
        );
      }

      // anything changed while the save was in flight stays, and stays dirty for the next save
      const unchanged = isEqual(toApiPayload(getValues() as TtaRequestFormValues), payload);
      if (unchanged && shouldUpdateFormData(isAutoSave)) {
        // the saved grants are the ones already chosen, not a change of grant
        previousGrantKey.current = grantIdsKey(saved.grants);
        reset(toFormValues(saved, recipientOptions ?? []));
      }

      setSaveError(null);
      if (isAutoSave) {
        setLastAutoSaveTime(moment());
      } else {
        setLastSaveTime(moment());
        updateShowSavedDraft(true);
      }
    } catch {
      setSaveError(SAVE_ERROR);
    } finally {
      if (!isAutoSave) {
        setIsAppLoading(false);
      }
    }
  };

  useInterval(async () => {
    // Don't auto save if we are already saving, or if the form hasn't been touched. A skipped
    // tick returns before taking the lock, so it can't release one an in-flight save holds.
    if (isAppLoading || !isDirty || weAreAutoSaving) {
      return;
    }
    setWeAreAutoSaving(true);
    try {
      await onSaveDraft(true);
    } finally {
      setWeAreAutoSaving(false);
    }
  }, AUTOSAVE_INTERVAL);

  const onSubmit = () => {
    // TODO: submit the request once the TTA request API exists
    history.push(backLinkTo);
  };

  // nothing to show until the draft in the route has been fetched, as the other forms wait for
  // their report; the form's defaults would otherwise be saved over it. An id that can't be a
  // request's has nothing to fetch.
  if (!isNewRequest && !savedRequest) {
    const error = routeId === null ? LOAD_ERROR : loadError;
    return error ? (
      <Alert type="error" headingLevel="h4" className="margin-bottom-3">
        {error}
      </Alert>
    ) : null;
  }

  return (
    <div className="maxw-widescreen">
      <Helmet>
        <title>TTA request</title>
      </Helmet>
      <TtaRequestFormHeading backLinkTo={backLinkTo} />
      {/* eslint-disable-next-line react/jsx-props-no-spreading */}
      <FormProvider {...hookForm}>
        <Container paddingX={4} paddingY={4} className="width-tablet">
          <h2 className="margin-top-0 margin-bottom-1">TTA Request summary</h2>
          <IndicatesRequiredField />
          <form onSubmit={hookForm.handleSubmit(onSubmit)}>
            <WhoIsTheRequestFor recipientOptions={recipientOptions} recipient={recipient} />
            <GoalAndContext regionId={effectiveRegionId} />
            <SubmitForReview regionId={effectiveRegionId} />
            {saveError && (
              <Alert
                type="error"
                headingLevel="h4"
                slim
                aria-live="polite"
                className="margin-top-4 maxw-mobile-lg"
              >
                {saveError}
              </Alert>
            )}
            {lastAutoSaveTime && (
              <Alert
                type="success"
                headingLevel="h4"
                slim
                noIcon
                aria-live="polite"
                aria-atomic
                className="smart-hub--save-alert margin-top-4 maxw-mobile-lg"
              >
                Autosaved on:
                <br />
                <span>• our network at {lastAutoSaveTime.format(DATE_DISPLAY_SAVED_FORMAT)}</span>
              </Alert>
            )}
            <div className="display-flex margin-top-4">
              <Button type="submit" className="margin-right-1">
                Submit
              </Button>
              <Button
                type="button"
                outline
                disabled={weAreAutoSaving}
                onClick={() => onSaveDraft()}
              >
                Save draft
              </Button>
            </div>
            <DismissingComponentWrapper
              shown={showSavedDraft}
              updateShown={updateShowSavedDraft}
              hideFromScreenReader={false}
            >
              {lastSaveTime && (
                <Alert
                  className="margin-top-3 maxw-mobile-lg"
                  headingLevel="h4"
                  noIcon
                  slim
                  type="success"
                  aria-live="off"
                >
                  Draft saved on {lastSaveTime.format('MM/DD/YYYY [at] h:mm a z')}
                </Alert>
              )}
            </DismissingComponentWrapper>
          </form>
        </Container>
      </FormProvider>
    </div>
  );
}
