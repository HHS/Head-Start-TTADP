import { useEffect } from 'react';
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
  try {
    if (replacementKey) {
      window.localStorage.setItem(
        dataKey(replacementKey),
        window.localStorage.getItem(dataKey(id)),
      );
      window.localStorage.setItem(
        editableKey(replacementKey),
        window.localStorage.getItem(LOCAL_STORAGE_AR_EDITABLE_KEY(id)),
      );
      window.localStorage.setItem(
        additionalDataKey(replacementKey),
        window.localStorage.getItem(additionalDataKey(id)),
      );
    }

    window.localStorage.removeItem(dataKey(id));
    window.localStorage.removeItem(additionalDataKey(id));
    window.localStorage.removeItem(editableKey(id));
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
  // cleanup local storage if the report has been submitted or approved
  useEffect(() => {
    if (formData
          && (formData.calculatedStatus === REPORT_STATUSES.APPROVED
          || formData.calculatedStatus === REPORT_STATUSES.SUBMITTED)
    ) {
      cleanupLocalStorage(reportId, dataKey, editableKey, additionalDataKey);
    }
  }, [reportId, formData, dataKey, editableKey, additionalDataKey]);

  // return a function to cleanup local storage for a given report ID and replacement key
  const cleanup = (reportIdToClean, dataKeyToClean) => (
    cleanupLocalStorage(reportIdToClean, dataKeyToClean, editableKey, additionalDataKey)
  );
  return cleanup;
}
