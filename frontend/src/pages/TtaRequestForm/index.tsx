import moment from 'moment';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Helmet } from 'react-helmet';
import { FormProvider, useForm } from 'react-hook-form';
import { Redirect, useHistory } from 'react-router-dom';
import { defaultValues, TTA_REQUEST_FIELDS } from './constants';
import pages from './pages';
import TtaRequestFormHeading from './TtaRequestFormHeading';
import TtaRequestFormNavigator from './TtaRequestFormNavigator';
import type { TtaRequestAdditionalData, TtaRequestGrant, TtaRequestRecipient } from './types';

interface TtaRequestFormMatchParams {
  ttaRequestId: string;
  currentPage?: string;
}

interface TtaRequestFormProps {
  /** set when the request was started from a recipient's TTA records */
  recipient?: TtaRequestRecipient | null;
  /** every recipient the user can pick from, when started from the TTA requests page */
  recipientOptions?: TtaRequestRecipient[] | null;
  /** the region of the recipient's record, when there is one */
  regionId?: number | null;
  /** where the back link and a finished request return the user to, and the root every
   * page's URL is built under */
  backLinkTo: string;
  match: { params: TtaRequestFormMatchParams };
}

/**
 * The TTA request form. Both entry points - a recipient's TTA records and the TTA requests
 * page - render this, differing only in whether the recipient arrives fixed or is chosen here.
 *
 * TODO: there is no API for TTA requests yet, so submitting and saving a draft validate and
 * navigate but do not persist. Wire both to a fetcher once the backend ticket lands - guard
 * any `hookForm.reset()` added at that point with `shouldUpdateFormData` (see
 * utils/formRichTextEditorHelper.js) so autosave can't interrupt an in-progress edit in the
 * Goal and context page's rich text editor.
 */
export default function TtaRequestForm({
  recipient = null,
  recipientOptions = null,
  regionId = null,
  backLinkTo,
  match: {
    params: { ttaRequestId, currentPage },
  },
}: TtaRequestFormProps): React.ReactElement {
  const history = useHistory();
  const requestId = useRef(ttaRequestId);
  const [lastSaveTime, setLastSaveTime] = useState<moment.Moment | null>(null);
  const [showSavedDraft, setShowSavedDraft] = useState(false);

  const hookForm = useForm({
    mode: 'onBlur',
    shouldUnregister: false,
    defaultValues: {
      ...defaultValues,
      [TTA_REQUEST_FIELDS.RECIPIENT]: recipient,
    },
  });

  const { setValue, watch } = hookForm;
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

  const onSave = async () => {
    // TODO: save hookForm.getValues() once the TTA request API exists. A draft is saved as
    // it stands, so this deliberately sidesteps validation.
    setLastSaveTime(moment());
    setShowSavedDraft(true);
  };

  const updatePage = (position: number) => {
    const page = pages.find((p) => p.position === position);
    if (!page) {
      return;
    }
    history.push(`${backLinkTo}/${requestId.current}/${page.path}`);
  };

  const preFlightForNavigation = async () => {
    const whereWeAre = pages.find((p) => p.path === currentPage);
    if (!whereWeAre || whereWeAre.fields.length === 0) {
      return true;
    }
    return hookForm.trigger(whereWeAre.fields);
  };

  const onFormSubmit = async () => {
    const allPagesComplete = pages.every((p) => p.isPageComplete(hookForm));
    if (!allPagesComplete) {
      return;
    }
    // TODO: submit the request once the TTA request API exists
    history.push(backLinkTo);
  };

  const additionalData: TtaRequestAdditionalData = useMemo(
    () => ({ recipientOptions, recipient, regionId: effectiveRegionId }),
    [recipientOptions, recipient, effectiveRegionId]
  );

  if (!currentPage) {
    return <Redirect to={`${backLinkTo}/${requestId.current}/${pages[0].path}`} />;
  }

  return (
    <div className="maxw-widescreen">
      <Helmet>
        <title>TTA request</title>
      </Helmet>
      <TtaRequestFormHeading backLinkTo={backLinkTo} />
      {/* eslint-disable-next-line react/jsx-props-no-spreading */}
      <FormProvider {...hookForm}>
        <TtaRequestFormNavigator
          pages={pages}
          currentPage={currentPage}
          reportId={requestId.current}
          additionalData={additionalData}
          updatePage={updatePage}
          onSave={onSave}
          onFormSubmit={onFormSubmit}
          preFlightForNavigation={preFlightForNavigation}
          lastSaveTime={lastSaveTime}
          updateLastSaveTime={setLastSaveTime}
          showSavedDraft={showSavedDraft}
          updateShowSavedDraft={setShowSavedDraft}
        />
      </FormProvider>
    </div>
  );
}
