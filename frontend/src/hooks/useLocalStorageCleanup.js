import { useCallback, useEffect, useMemo } from 'react';
import { REPORT_STATUSES } from '@ttahub/common/src/constants';
import {
  LOCAL_STORAGE_AR_ADDITIONAL_DATA_KEY,
  LOCAL_STORAGE_AR_DATA_KEY,
  LOCAL_STORAGE_AR_EDITABLE_KEY,
} from '../Constants';

export function cleanupLocalStorage(
  id,
  replacementKey,
  dataKey = LOCAL_STORAGE_AR_DATA_KEY,
  editableKey = LOCAL_STORAGE_AR_EDITABLE_KEY,
  additionalDataKey = LOCAL_STORAGE_AR_ADDITIONAL_DATA_KEY,
) {
  const newDataKey = dataKey(replacementKey);
  const oldDataKey = dataKey(id);

  const newEditableKey = editableKey(replacementKey);
  const oldEditableKey = editableKey(id);

  const newAdditionalDataKey = additionalDataKey(replacementKey);
  const oldAdditionalDataKey = additionalDataKey(id);

  try {
    if (replacementKey) {
      window.localStorage.setItem(
        newDataKey,
        window.localStorage.getItem(oldDataKey),
      );
      window.localStorage.setItem(
        newEditableKey,
        window.localStorage.getItem(oldEditableKey),
      );
      window.localStorage.setItem(
        newAdditionalDataKey,
        window.localStorage.getItem(oldAdditionalDataKey),
      );
    }

    window.localStorage.removeItem(oldDataKey);
    window.localStorage.removeItem(oldAdditionalDataKey);
    window.localStorage.removeItem(oldEditableKey);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('Local storage may not be available: ', e);
  }
}

export default function useLocalStorageCleanup(
  formData,
  reportId,
  dataKey = LOCAL_STORAGE_AR_DATA_KEY,
  editableKey = LOCAL_STORAGE_AR_EDITABLE_KEY,
  additionalDataKey = LOCAL_STORAGE_AR_ADDITIONAL_DATA_KEY,
) {
  const keys = useMemo(() => ({
    data: dataKey,
    editable: editableKey,
    additional: additionalDataKey,
  }), [additionalDataKey, dataKey, editableKey]);

  const {
    editable, additional, data,
  } = keys;

  // cleanup local storage if the report has been submitted or approved
  useEffect(() => {
    if (formData && (formData.calculatedStatus === REPORT_STATUSES.APPROVED
      || formData.calculatedStatus === REPORT_STATUSES.SUBMITTED)
    ) {
      cleanupLocalStorage(reportId, null, data, editable, additional);
    }
  }, [reportId, formData, editable, data, additional]);

  // return a function to cleanup local storage for a given report ID and replacement key
  const cleanup = useCallback((reportIdToClean, dataKeyToClean) => (
    cleanupLocalStorage(reportIdToClean, dataKeyToClean, data, editable, additional)
  ), [additional, data, editable]);
  return cleanup;
}
