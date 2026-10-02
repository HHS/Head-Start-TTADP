import moment from 'moment';
import React from 'react';
import { useFormContext } from 'react-hook-form';
import { NOOP } from '../../Constants';
import Navigator from '../../components/Navigator';
import useHookFormPageState from '../../hooks/useHookFormPageState';
import type { TtaRequestAdditionalData, TtaRequestPage } from './types';

interface TtaRequestFormNavigatorProps {
  pages: TtaRequestPage[];
  currentPage: string;
  reportId: string;
  additionalData: TtaRequestAdditionalData;
  updatePage: (position: number) => void;
  onSave: () => Promise<void>;
  onFormSubmit: () => Promise<void>;
  preFlightForNavigation: () => Promise<boolean>;
  lastSaveTime: moment.Moment | null;
  updateLastSaveTime: (time: moment.Moment | null) => void;
  showSavedDraft: boolean;
  updateShowSavedDraft: (shown: boolean) => void;
}

/**
 * Wires the TTA request's pages into the shared Navigator, the same role
 * CommunicationLog's LogFormNavigator plays for the Communication Log form.
 */
export default function TtaRequestFormNavigator({
  pages,
  currentPage,
  reportId,
  additionalData,
  updatePage,
  onSave,
  onFormSubmit,
  preFlightForNavigation,
  lastSaveTime,
  updateLastSaveTime,
  showSavedDraft,
  updateShowSavedDraft,
}: TtaRequestFormNavigatorProps): React.ReactElement {
  const hookForm = useFormContext();

  // hook to update the page state in the sidebar
  useHookFormPageState(hookForm, pages, currentPage);

  const formData = { ...hookForm.getValues(), regionId: additionalData.regionId };

  return (
    <Navigator
      key={currentPage}
      pages={pages}
      currentPage={currentPage}
      additionalData={additionalData}
      formData={formData}
      reportId={reportId}
      updatePage={updatePage}
      onSave={onSave}
      onSaveDraft={onSave}
      onFormSubmit={onFormSubmit}
      preFlightForNavigation={preFlightForNavigation}
      onReview={NOOP}
      isApprover={false}
      isPendingApprover={false}
      lastSaveTime={lastSaveTime}
      updateLastSaveTime={updateLastSaveTime}
      showSavedDraft={showSavedDraft}
      updateShowSavedDraft={updateShowSavedDraft}
    />
  );
}
