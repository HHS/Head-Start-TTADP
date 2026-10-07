import { Alert, Button } from '@trussworks/react-uswds';
import useInterval from '@use-it/interval';
import moment from 'moment';
import React, { useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet';
import { FormProvider, useForm } from 'react-hook-form';
import { useHistory } from 'react-router-dom';
import Container from '../../components/Container';
import IndicatesRequiredField from '../../components/IndicatesRequiredField';
import {
  AUTOSAVE_INTERVAL,
  DATE_DISPLAY_SAVED_FORMAT,
  defaultValues,
  TTA_REQUEST_FIELDS,
} from './constants';
import GoalAndContext from './GoalAndContext';
import SubmitForReview from './SubmitForReview';
import TtaRequestFormHeading from './TtaRequestFormHeading';
import type { TtaRequestGrant, TtaRequestRecipient } from './types';
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

/**
 * The TTA request form. Both entry points - a recipient's TTA records and the TTA requests
 * page - render this, differing only in whether the recipient arrives fixed or is chosen here.
 *
 * TODO: there is no API for TTA requests yet, so submitting and saving a draft validate and
 * navigate but do not persist. Wire both to a fetcher once the backend ticket lands.
 */
export default function TtaRequestForm({
  recipient = null,
  recipientOptions = null,
  regionId = null,
  backLinkTo,
}: TtaRequestFormProps): React.ReactElement {
  const history = useHistory();
  const [lastSaveTime, setLastSaveTime] = useState<moment.Moment | null>(null);

  const hookForm = useForm({
    mode: 'onBlur',
    defaultValues: {
      ...defaultValues,
      [TTA_REQUEST_FIELDS.RECIPIENT]: recipient,
    },
  });

  const { setValue, watch } = hookForm;

  useEffect(() => {
    if (recipient) {
      setValue(TTA_REQUEST_FIELDS.RECIPIENT, recipient);
    }
  }, [recipient, setValue]);

  const selectedGrants: TtaRequestGrant[] = watch(TTA_REQUEST_FIELDS.GRANTS);

  // the region follows the grants, which is what the goals, citations and approvers hang off
  const effectiveRegionId = regionId ?? selectedGrants[0]?.regionId ?? null;

  // goals belong to grants and approvers to a region, so neither survives a change of grant
  const grantKey = selectedGrants.map((grant) => grant.id).join(',');
  const previousGrantKey = useRef(grantKey);
  useEffect(() => {
    if (previousGrantKey.current === grantKey) {
      return;
    }
    previousGrantKey.current = grantKey;
    setValue(TTA_REQUEST_FIELDS.GOAL, null);
    setValue(TTA_REQUEST_FIELDS.CITATIONS, []);
    setValue(TTA_REQUEST_FIELDS.REVIEWER, null);
  }, [grantKey, setValue]);

  const onSaveDraft = () => {
    // TODO: save hookForm.getValues() once the TTA request API exists. A draft is saved as
    // it stands, so this deliberately sidesteps validation.
    setLastSaveTime(moment());
  };

  useInterval(onSaveDraft, AUTOSAVE_INTERVAL);

  const onSubmit = () => {
    // TODO: submit the request once the TTA request API exists
    history.push(backLinkTo);
  };

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
            {lastSaveTime && (
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
                <span>• our network at {lastSaveTime.format(DATE_DISPLAY_SAVED_FORMAT)}</span>
              </Alert>
            )}
            <div className="display-flex margin-top-4">
              <Button type="submit" className="margin-right-1">
                Submit
              </Button>
              <Button type="button" outline onClick={onSaveDraft}>
                Save draft
              </Button>
            </div>
          </form>
        </Container>
      </FormProvider>
    </div>
  );
}
